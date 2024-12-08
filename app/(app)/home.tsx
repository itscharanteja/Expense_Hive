import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, RefreshControl, FlatList, StatusBar } from "react-native";
import { useAuth } from "../context/auth";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs, doc as firestoreDoc, getDoc, orderBy, limit } from "firebase/firestore";
import { db } from "../config/firebase";
import { Colors } from "../constants/Colors";
import { LinearGradient } from 'expo-linear-gradient';

type ExpenseSummary = {
  totalPersonal: number;
  totalGroupShare: number;
  pendingTasks: number;
  groupCount: number;
  recentExpenses: RecentExpense[];
};

type RecentExpense = {
  id: string;
  amount: number;
  description: string;
  date: Date;
  isGroup: boolean;
  groupName?: string;
  shareAmount?: number;
  groupId?: string;
};

export default function Home() {
  const { user, userData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalPersonal: 0,
    totalGroupShare: 0,
    pendingTasks: 0,
    groupCount: 0,
    recentExpenses: [],
  });

  const fetchSummary = async () => {
    if (!user) return;

    try {
      const personalExpensesQuery = query(
        collection(db, "expenses"),
        where("userId", "==", user.uid)
      );
      const personalExpensesSnapshot = await getDocs(personalExpensesQuery);
      const totalPersonal = personalExpensesSnapshot.docs.reduce(
        (sum, doc) => sum + doc.data().amount,
        0
      );

      const personalExpenses = personalExpensesSnapshot.docs.map((doc) => ({
        id: doc.id,
        amount: doc.data().amount,
        description: doc.data().description,
        date: doc.data().date.toDate(),
        isGroup: false,
      }));

      const groupExpensesQuery = query(
        collection(db, "groupExpenses"),
        where("splitBetween", "array-contains", user.email),
        orderBy("date", "desc"),
        limit(5)
      );
      const groupExpensesSnapshot = await getDocs(groupExpensesQuery);

      let totalGroupShare = 0;
      const groupExpenses = [];

      for (const expenseDoc of groupExpensesSnapshot.docs) {
        const expenseData = expenseDoc.data();
        const shareAmount = expenseData.amount / expenseData.splitBetween.length;
        totalGroupShare += shareAmount;

        const groupRef = firestoreDoc(db, "groups", expenseData.groupId);
        const groupDoc = await getDoc(groupRef);
        const groupName = groupDoc.exists() ? groupDoc.data().name : "Unknown Group";

        groupExpenses.push({
          id: expenseDoc.id,
          amount: expenseData.amount,
          description: expenseData.description,
          date: expenseData.date.toDate(),
          isGroup: true,
          groupName,
          shareAmount,
          groupId: expenseData.groupId,
        });
      }

      const allExpenses = [...personalExpenses, ...groupExpenses]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);

      setSummary({
        totalPersonal,
        totalGroupShare,
        pendingTasks: 0,
        groupCount: 0,
        recentExpenses: allExpenses,
      });
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [user]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchSummary();
  }, []);

  const renderRecentExpense = ({ item }: { item: RecentExpense }) => (
    <View style={styles.expenseItem} key={item.id}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription}>{item.description}</Text>
        <Text style={styles.expenseDate}>{item.date.toLocaleDateString()}</Text>
        {item.isGroup && (
          <View style={styles.groupInfo}>
            <Text style={styles.groupTag}>{item.groupName}</Text>
            <Text style={styles.shareAmount}>
              Your share: {item.shareAmount?.toFixed(2)} kr
            </Text>
          </View>
        )}
      </View>
      <View style={styles.expenseAmount}>
        <Text style={styles.amount}>
          {item.isGroup ? item.shareAmount?.toFixed(2) : item.amount.toFixed(2)} kr
        </Text>
        {item.isGroup && <Text style={styles.groupTag}>Group</Text>}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[
          Colors.primary + '40',
          Colors.primary + '15',
          Colors.primary + '08',
          Colors.accent + '05'
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      />
      
      <View style={styles.headerSection}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.username}>
            @{userData?.username 
              ? userData.username.charAt(0).toUpperCase() + userData.username.slice(1) 
              : 'User'}
          </Text>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="wallet-outline" size={24} color={Colors.primary} />
            <Text style={styles.summaryTitle}>Personal Expenses</Text>
            <Text style={styles.summaryAmount}>
              {summary.totalPersonal.toFixed(2)} kr
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="people-outline" size={24} color={Colors.primary} />
            <Text style={styles.summaryTitle}>My Group Shares</Text>
            <Text style={styles.summaryAmount}>
              {summary.totalGroupShare.toFixed(2)} kr
            </Text>
          </View>
        </View>

        <View style={styles.totalExpense}>
          <Text style={styles.totalExpenseTitle}>Total Expenses</Text>
          <Text style={styles.totalExpenseAmount}>
            {(summary.totalPersonal + summary.totalGroupShare).toFixed(2)} kr
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Expenses</Text>
      </View>

      <FlatList
        style={styles.expensesList}
        data={summary.recentExpenses}
        renderItem={renderRecentExpense}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            title="Pull to refresh"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerSection: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 0,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.black,
  },
  username: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  summaryContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: Colors.text,
    marginVertical: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary,
  },
  totalExpense: {
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  totalExpenseTitle: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  totalExpenseAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: "#666",
  },
  groupInfo: {
    marginTop: 4,
  },
  groupTag: {
    fontSize: 12,
    color: Colors.accent,
  },
  shareAmount: {
    fontSize: 12,
    color: "#666",
  },
  expenseAmount: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  expensesList: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -4,
  },
});

