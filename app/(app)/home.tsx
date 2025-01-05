import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  FlatList,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../context/auth";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  doc as firestoreDoc,
  getDoc,
  orderBy,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
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
  start.setHours(0, 0, 0, 0);

  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
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
    expenses: [] as RecentExpense[],
  });

  const fetchSummary = () => {
    if (!user) return;

    const { start, end } = getMonthDateRange();

    const personalExpensesQuery = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end)),
      orderBy("date", "desc")
    );

    const groupExpensesQuery = query(
      collection(db, "groupExpenses"),
      where("splitBetween", "array-contains", user.email),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end)),
      orderBy("date", "desc")
    );

    const unsubscribePersonal = onSnapshot(
      personalExpensesQuery,
      (snapshot) => {
        const personalTotal = snapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0),
          0
        );

        const personalExpenses = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            amount: data.amount || 0,
            description: data.description || "",
            date: data.date.toDate(),
            timestamp: data.timestamp?.toDate() || data.date.toDate(),
            isGroup: false,
          };
        });

        setSummary((prev) => ({
          ...prev,
          totalPersonal: personalTotal || 0,
          recentExpenses: [...personalExpenses, ...groupExpenseState.expenses]
            .sort((a, b) => {
              const timeA = a.timestamp?.getTime() || Date.now();
              const timeB = b.timestamp?.getTime() || Date.now();
              return timeB - timeA;
            })
            .slice(0, 5),
        }));
      }
    );

    const unsubscribeGroup = onSnapshot(
      groupExpensesQuery,
      async (snapshot) => {
        let groupTotal = 0;
        const groupExpenses: RecentExpense[] = [];

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const shareAmount = data.amount / data.splitBetween.length;
          groupTotal += shareAmount;

          const groupDoc = await getDoc(
            firestoreDoc(db, "groups", data.groupId)
          );
          const groupName = groupDoc.exists()
            ? groupDoc.data().name
            : "Unknown Group";

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
          expenses: groupExpenses,
        });

        setSummary((prev) => ({
          ...prev,
          totalGroupShare: groupTotal,
          recentExpenses: [
            ...prev.recentExpenses.filter((exp) => !exp.isGroup),
            ...groupExpenses,
          ]
            .sort((a, b) => {
              const timeA = a.timestamp?.getTime() || Date.now();
              const timeB = b.timestamp?.getTime() || Date.now();
              return timeB - timeA;
            })
            .slice(0, 5),
        }));
      }
    );

    return () => {
      unsubscribePersonal();
      unsubscribeGroup();
    };
  };

  const fetchRecentExpenses = () => {
    if (!user) return;

    const recentPersonalQuery = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const recentGroupQuery = query(
      collection(db, "groupExpenses"),
      where("splitBetween", "array-contains", user.email),
      orderBy("date", "desc")
    );

    const unsubscribeRecentPersonal = onSnapshot(recentPersonalQuery, {
      next: (snapshot) => {
        const personalExpenses = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            amount: data.amount || 0,
            description: data.description || "",
            date: data.date.toDate(),
            timestamp: data.timestamp?.toDate() || data.date.toDate(),
            isGroup: false,
          };
        });

        setSummary((prev) => {
          const updatedExpenses = [
            ...personalExpenses,
            ...prev.recentExpenses.filter((exp) => exp.isGroup),
          ]
            .sort((a, b) => {
              const timeA = a.timestamp?.getTime() || Date.now();
              const timeB = b.timestamp?.getTime() || Date.now();
              return timeB - timeA;
            })
            .slice(0, 5);

          return {
            ...prev,
            recentExpenses: updatedExpenses,
          };
        });
      },
      error: (error) => {
        console.error("Error in personal expenses listener:", error);
      },
    });

    const unsubscribeRecentGroup = onSnapshot(recentGroupQuery, {
      next: async (snapshot) => {
        const groupExpenses: RecentExpense[] = [];

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const shareAmount = data.amount / data.splitBetween.length;

          const groupDoc = await getDoc(
            firestoreDoc(db, "groups", data.groupId)
          );
          const groupName = groupDoc.exists()
            ? groupDoc.data().name
            : "Unknown Group";

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

        setSummary((prev) => {
          const updatedExpenses = [
            ...prev.recentExpenses.filter((exp) => !exp.isGroup),
            ...groupExpenses,
          ]
            .sort((a, b) => {
              const timeA = a.timestamp?.getTime() || Date.now();
              const timeB = b.timestamp?.getTime() || Date.now();
              return timeB - timeA;
            })
            .slice(0, 5);

          return {
            ...prev,
            recentExpenses: updatedExpenses,
          };
        });
      },
      error: (error) => {
        console.error("Error in group expenses listener:", error);
      },
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
    fetchRecentExpenses();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderRecentExpense = ({ item }: { item: RecentExpense }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription}>{item.description}</Text>
        <Text style={styles.expenseDate}>
          {item.date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
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
        <Text style={[styles.amount, item.isGroup && styles.groupAmount]}>
          {item.isGroup ? item.shareAmount?.toFixed(2) : item.amount.toFixed(2)}{" "}
          kr
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
            @{userData?.username ? userData.username : "User"}
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

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <Text style={styles.totalAmount}>
            {(summary.totalPersonal + summary.totalGroupShare).toFixed(2)} kr
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Expenses</Text>
      </View>

      <FlatList
        style={styles.expensesList}
        data={summary.recentExpenses}
        renderItem={renderRecentExpense}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) =>
          `${item.isGroup ? "group" : "personal"}_${item.id}`
        } // Use composite key
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
  },
  gradientBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerSection: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.black,
    marginBottom: 8,
  },
  username: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: "500",
  },
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 15,
    color: Colors.text,
    marginVertical: 12,
    textAlign: "center",
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.primary,
  },
  totalContainer: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.black,
    marginBottom: 16,
  },
  expensesList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  expenseItem: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 16,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
    marginBottom: 8,
  },
  expenseDate: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  groupInfo: {
    backgroundColor: `${Colors.primary}10`,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  groupTag: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
  },
  shareAmount: {
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
  },
  expenseAmount: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 4,
  },
  groupAmount: {
    color: Colors.primary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "center",
    marginTop: 24,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.white,
  },
});
