import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "../context/auth";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Ionicons } from "@expo/vector-icons";

type ExpenseSummary = {
  totalPersonal: number;
  totalGroupShare: number;
  pendingTasks: number;
  groupCount: number;
  recentExpenses: {
    amount: number;
    description: string;
    date: Date;
    isGroup: boolean;
    groupName?: string;
    shareAmount?: number;
  }[];
};

export default function Home() {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
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
      // Get current month's start and end dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      // Fetch personal expenses for current month
      const personalExpensesQuery = query(
        collection(db, "expenses"),
        where("userId", "==", user.uid),
        where("date", ">=", Timestamp.fromDate(startOfMonth)),
        where("date", "<=", Timestamp.fromDate(endOfMonth))
      );
      const personalExpensesSnapshot = await getDocs(personalExpensesQuery);
      const totalPersonal = personalExpensesSnapshot.docs.reduce(
        (sum, doc) => sum + doc.data().amount,
        0
      );

      // Fetch group expenses for current month
      const groupExpensesQuery = query(
        collection(db, "groupExpenses"),
        where("splitBetween", "array-contains", user.email),
        where("date", ">=", Timestamp.fromDate(startOfMonth)),
        where("date", "<=", Timestamp.fromDate(endOfMonth))
      );
      const groupExpensesSnapshot = await getDocs(groupExpensesQuery);

      let totalGroupShare = 0;
      const groupExpensesData = [];

      // Calculate user's share in each group expense
      for (const expenseDoc of groupExpensesSnapshot.docs) {
        const expenseData = expenseDoc.data();
        const shareAmount =
          expenseData.amount / expenseData.splitBetween.length;
        totalGroupShare += shareAmount;

        // Get group name
        const groupRef = doc(db, "groups", expenseData.groupId);
        const groupDoc = await getDoc(groupRef);
        const groupName = groupDoc.exists()
          ? groupDoc.data().name
          : "Unknown Group";

        groupExpensesData.push({
          amount: expenseData.amount,
          shareAmount,
          description: expenseData.description,
          date: expenseData.date.toDate(),
          isGroup: true,
          groupName,
        });
      }

      // Get personal expenses data for current month
      const personalExpensesData = personalExpensesSnapshot.docs.map((doc) => ({
        amount: doc.data().amount,
        description: doc.data().description,
        date: doc.data().date.toDate(),
        isGroup: false,
      }));

      // Combine and sort all expenses
      const recentExpenses = [...personalExpensesData, ...groupExpensesData]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);

      // Fetch groups user is part of
      const groupsQuery = query(
        collection(db, "groups"),
        where("members", "array-contains", user.email)
      );
      const groupsSnapshot = await getDocs(groupsQuery);
      const groupCount = groupsSnapshot.size;

      // Fetch pending tasks assigned to user
      const tasksQuery = query(
        collection(db, "groupTasks"),
        where("assignedTo", "==", user.email),
        where("completed", "==", false)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const pendingTasks = tasksSnapshot.size;

      setSummary({
        totalPersonal,
        totalGroupShare,
        pendingTasks,
        groupCount,
        recentExpenses,
      });
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [user, summary]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchSummary();
  }, []);

  // Add month change detection
  useEffect(() => {
    let currentMonth = new Date().getMonth();

    const monthChangeCheck = setInterval(() => {
      const newMonth = new Date().getMonth();
      if (currentMonth !== newMonth) {
        currentMonth = newMonth;
        fetchSummary(); // Refresh data when month changes
      }
    }, 60000); // Check every minute

    return () => clearInterval(monthChangeCheck);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#007AFF"
          title="Pull to refresh"
        />
      }
    >
      <Text style={styles.welcomeText}>Welcome back!</Text>
      <Text style={styles.username}>@{userData?.username}</Text>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="wallet-outline" size={24} color="#007AFF" />
          <Text style={styles.summaryTitle}>Personal Expenses</Text>
          <Text style={styles.summaryAmount}>
            {summary.totalPersonal.toFixed(2)} kr
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons name="people-outline" size={24} color="#007AFF" />
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
      {summary.recentExpenses.map((expense, index) => (
        <View key={index} style={styles.expenseItem}>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseDescription}>{expense.description}</Text>
            <Text style={styles.expenseDate}>
              {expense.date.toLocaleDateString()}
            </Text>
            {expense.isGroup && (
              <View style={styles.groupInfo}>
                <Text style={styles.groupTag}>{expense.groupName}</Text>
                <Text style={styles.shareAmount}>
                  Your share: {expense.shareAmount?.toFixed(2)} kr
                </Text>
              </View>
            )}
          </View>
          <View style={styles.expenseAmount}>
            <Text style={styles.amount}>
              {expense.isGroup
                ? expense.shareAmount?.toFixed(2)
                : expense.amount.toFixed(2)}{" "}
              kr
            </Text>
            {expense.isGroup && <Text style={styles.groupTag}>Group</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  username: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    fontWeight: "500",
  },
  summaryContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statsContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  statText: {
    fontSize: 16,
    color: "#333",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  expenseAmount: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  groupTag: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  totalExpense: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: "center",
  },
  totalExpenseTitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  totalExpenseAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  groupInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  shareAmount: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  monthDisplay: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
});
