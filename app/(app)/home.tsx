import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useAuth } from "../context/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { Ionicons } from "@expo/vector-icons";

type ExpenseSummary = {
  totalPersonal: number;
  totalGroup: number;
  pendingTasks: number;
  groupCount: number;
  recentExpenses: {
    amount: number;
    description: string;
    date: Date;
    isGroup: boolean;
  }[];
};

export default function Home() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalPersonal: 0,
    totalGroup: 0,
    pendingTasks: 0,
    groupCount: 0,
    recentExpenses: [],
  });

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user) return;

      try {
        // Fetch personal expenses
        const personalExpensesQuery = query(
          collection(db, "expenses"),
          where("userId", "==", user.uid)
        );
        const personalExpensesSnapshot = await getDocs(personalExpensesQuery);
        const totalPersonal = personalExpensesSnapshot.docs.reduce(
          (sum, doc) => sum + doc.data().amount,
          0
        );

        // Fetch groups user is part of
        const groupsQuery = query(
          collection(db, "groups"),
          where("members", "array-contains", user.email)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        const groupCount = groupsSnapshot.size;

        // Fetch group expenses where user is involved
        const groupExpensesQuery = query(
          collection(db, "groupExpenses"),
          where("splitBetween", "array-contains", user.email)
        );
        const groupExpensesSnapshot = await getDocs(groupExpensesQuery);
        const totalGroup = groupExpensesSnapshot.docs.reduce(
          (sum, doc) => sum + doc.data().amount,
          0
        );

        // Fetch pending tasks assigned to user
        const tasksQuery = query(
          collection(db, "groupTasks"),
          where("assignedTo", "==", user.email),
          where("completed", "==", false)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        const pendingTasks = tasksSnapshot.size;

        // Get recent expenses (both personal and group)
        const recentExpenses = [
          ...personalExpensesSnapshot.docs.map((doc) => ({
            amount: doc.data().amount,
            description: doc.data().description,
            date: doc.data().date.toDate(),
            isGroup: false,
          })),
          ...groupExpensesSnapshot.docs.map((doc) => ({
            amount: doc.data().amount,
            description: doc.data().description,
            date: doc.data().date.toDate(),
            isGroup: true,
          })),
        ]
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5);

        setSummary({
          totalPersonal,
          totalGroup,
          pendingTasks,
          groupCount,
          recentExpenses,
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching summary:", error);
        setLoading(false);
      }
    };

    fetchSummary();
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.welcomeText}>Welcome back!</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="wallet-outline" size={24} color="#007AFF" />
          <Text style={styles.summaryTitle}>Personal Expenses</Text>
          <Text style={styles.summaryAmount}>
            ${summary.totalPersonal.toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons name="people-outline" size={24} color="#007AFF" />
          <Text style={styles.summaryTitle}>Group Expenses</Text>
          <Text style={styles.summaryAmount}>
            ${summary.totalGroup.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.statText}>
            {summary.pendingTasks} pending tasks
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={20} color="#007AFF" />
          <Text style={styles.statText}>
            Member of {summary.groupCount} groups
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Expenses</Text>
      {summary.recentExpenses.map((expense, index) => (
        <View key={index} style={styles.expenseItem}>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseDescription}>
              {expense.description}
            </Text>
            <Text style={styles.expenseDate}>
              {expense.date.toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.expenseAmount}>
            <Text style={styles.amount}>
              ${expense.amount.toFixed(2)}
            </Text>
            {expense.isGroup && (
              <Text style={styles.groupTag}>Group</Text>
            )}
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
  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
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
});
