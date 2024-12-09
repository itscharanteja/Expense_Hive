import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  FlatList,
  StatusBar,
} from "react-native";
import { useAuth } from "../context/auth";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs, doc as firestoreDoc, getDoc, orderBy, limit, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { Colors } from "../constants/Colors";
import { LinearGradient } from "expo-linear-gradient";

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
  timestamp: Date;
  isGroup: boolean;
  groupName?: string;
  shareAmount?: number;
  groupId?: string;
};

const getMonthDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);  // Start of first day
  
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);  // End of last day
  return { start, end };
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
  const [groupExpenseState, setGroupExpenseState] = useState({
    total: 0,
    expenses: [] as RecentExpense[]
  });

  const fetchSummary = () => {
    if (!user) return;

    const { start, end } = getMonthDateRange();

    // Personal expenses query
    const personalExpensesQuery = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end)),
      orderBy("date", "desc")
    );

    // Group expenses query
    const groupExpensesQuery = query(
      collection(db, "groupExpenses"),
      where("splitBetween", "array-contains", user.email),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end)),
      orderBy("date", "desc")
    );

    // Personal expenses listener
    const unsubscribePersonal = onSnapshot(personalExpensesQuery, (snapshot) => {
      const personalTotal = snapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      const personalExpenses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          amount: data.amount || 0,
          description: data.description || '',
          date: data.date.toDate(),
          timestamp: data.timestamp?.toDate() || data.date.toDate(),
          isGroup: false,
        };
      });

      setSummary(prev => ({
        ...prev,
        totalPersonal: personalTotal || 0,
        recentExpenses: [
          ...personalExpenses,
          ...groupExpenseState.expenses
        ]
          .sort((a, b) => {
            const timeA = a.timestamp?.getTime() || Date.now();
            const timeB = b.timestamp?.getTime() || Date.now();
            return timeB - timeA;
          })
          .slice(0, 5)
      }));
    });

    // Group expenses listener
    const unsubscribeGroup = onSnapshot(groupExpensesQuery, async (snapshot) => {
      let groupTotal = 0;
      const groupExpenses: RecentExpense[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const shareAmount = data.amount / data.splitBetween.length;
        groupTotal += shareAmount;

        const groupDoc = await getDoc(firestoreDoc(db, "groups", data.groupId));
        const groupName = groupDoc.exists() ? groupDoc.data().name : "Unknown Group";

        groupExpenses.push({
          id: doc.id,
          amount: data.amount,
          description: data.description,
          date: data.date.toDate(),
          timestamp: data.timestamp?.toDate() || data.date.toDate(),
          isGroup: true,
          groupName,
          shareAmount,
          groupId: data.groupId,
        });
      }

      setGroupExpenseState({
        total: groupTotal,
        expenses: groupExpenses
      });

      setSummary(prev => ({
        ...prev,
        totalGroupShare: groupTotal,
        recentExpenses: [
          ...prev.recentExpenses.filter(exp => !exp.isGroup),
          ...groupExpenses
        ]
          .sort((a, b) => {
            const timeA = a.timestamp?.getTime() || Date.now();
            const timeB = b.timestamp?.getTime() || Date.now();
            return timeB - timeA;
          })
          .slice(0, 5)
      }));
    });

    return () => {
      unsubscribePersonal();
      unsubscribeGroup();
    };
  };

  const fetchRecentExpenses = () => {
    if (!user) return;

    // Get all personal expenses ordered by date
    const recentPersonalQuery = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    // Get all group expenses ordered by date
    const recentGroupQuery = query(
      collection(db, "groupExpenses"),
      where("splitBetween", "array-contains", user.email),
      orderBy("date", "desc")
    );

    // Listen to personal expenses with changes
    const unsubscribeRecentPersonal = onSnapshot(recentPersonalQuery, {
      next: (snapshot) => {
        // Handle added or modified expenses
        const changes = snapshot.docChanges();
        const personalExpenses = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            amount: data.amount || 0,
            description: data.description || '',
            date: data.date.toDate(),
            timestamp: data.timestamp?.toDate() || data.date.toDate(),
            isGroup: false,
          };
        });

        setSummary(prev => {
          const updatedExpenses = [
            ...personalExpenses,
            ...prev.recentExpenses.filter(exp => exp.isGroup)
          ].sort((a, b) => {
            const timeA = a.timestamp?.getTime() || Date.now();
            const timeB = b.timestamp?.getTime() || Date.now();
            return timeB - timeA;
          })
           .slice(0, 5);

          return {
            ...prev,
            recentExpenses: updatedExpenses
          };
        });
      },
      error: (error) => {
        console.error("Error in personal expenses listener:", error);
      }
    });

    // Listen to group expenses with changes
    const unsubscribeRecentGroup = onSnapshot(recentGroupQuery, {
      next: async (snapshot) => {
        const groupExpenses: RecentExpense[] = [];

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const shareAmount = data.amount / data.splitBetween.length;

          const groupDoc = await getDoc(firestoreDoc(db, "groups", data.groupId));
          const groupName = groupDoc.exists() ? groupDoc.data().name : "Unknown Group";

          groupExpenses.push({
            id: doc.id,
            amount: data.amount,
            description: data.description,
            date: data.date.toDate(),
            timestamp: data.timestamp?.toDate() || data.date.toDate(),
            isGroup: true,
            groupName,
            shareAmount,
            groupId: data.groupId,
          });
        }

        setSummary(prev => {
          const updatedExpenses = [
            ...prev.recentExpenses.filter(exp => !exp.isGroup),
            ...groupExpenses
          ].sort((a, b) => {
            const timeA = a.timestamp?.getTime() || Date.now();
            const timeB = b.timestamp?.getTime() || Date.now();
            return timeB - timeA;
          })
           .slice(0, 5);

          return {
            ...prev,
            recentExpenses: updatedExpenses
          };
        });
      },
      error: (error) => {
        console.error("Error in group expenses listener:", error);
      }
    });

    return () => {
      unsubscribeRecentPersonal();
      unsubscribeRecentGroup();
    };
  };

  useEffect(() => {
    const unsubscribe = fetchSummary();
    const unsubscribeRecent = fetchRecentExpenses();
    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeRecent) unsubscribeRecent();
    };
  }, [user]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchSummary();
  }, []);

  const renderRecentExpense = ({ item }: { item: RecentExpense }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription}>{item.description}</Text>
        <Text style={styles.expenseDate}>
          {item.date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Text>
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
        <Text style={[
          styles.amount,
          item.isGroup && styles.groupAmount
        ]}>
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
          Colors.primary + "40",
          Colors.primary + "15",
          Colors.primary + "08",
          Colors.accent + "05",
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
            <Text style={styles.summaryTitle}>Personal</Text>
            <Text style={styles.summaryTitle}>Personal Expenses</Text>
            <Text style={styles.summaryAmount}>
              {summary.totalPersonal.toFixed(2)} kr
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="people-outline" size={24} color={Colors.primary} />
            <Text style={styles.summaryTitle}>Group</Text>

            <Text style={styles.summaryTitle}>My Group Shares</Text>
            <Text style={styles.summaryAmount}>
              {summary.totalGroupShare.toFixed(2)} kr
            </Text>
          </View>
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <Text style={styles.totalAmount}>
        <View style={styles.totalExpense}>
          <Text style={styles.totalExpenseTitle}>Total Expenses</Text>
          <Text style={styles.totalExpenseAmount}>
            {(summary.totalPersonal + summary.totalGroupShare).toFixed(2)} kr
          </Text>
        </View>


        <Text style={styles.sectionTitle}>Recent Expenses</Text>
      </View>


            <View style={styles.totalExpense}>
              <Text style={styles.totalExpenseTitle}>Total Expenses</Text>
              <Text style={styles.totalExpenseAmount}>
                {(summary.totalPersonal + summary.totalGroupShare).toFixed(2)}{" "}
                kr
              </Text>
            </View>


      <FlatList
        style={styles.expensesList}
        data={summary.recentExpenses}
        renderItem={renderRecentExpense}
        keyExtractor={(item) => `${item.isGroup ? 'group' : 'personal'}_${item.id}`}  // Use composite key
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
    position: "absolute",
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
  totalContainer: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 24,
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
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 16,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.black,
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  groupInfo: {
    marginTop: 4,
  },
  groupTag: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: "500",
  },
  shareAmount: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 2,
  },
  expenseAmount: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.primary,
  },
  groupAmount: {
    color: Colors.accent,
  },
  expensesList: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -4,
  },
  expensesList: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -4,
  },
});
