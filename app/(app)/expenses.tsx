import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
  doc as firestoreDoc,
  deleteDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/auth";
import { Picker } from "@react-native-picker/picker";
import { Colors } from "../constants/Colors";

type Expense = {
  id: string;
  amount: number;
  category?: string;
  description: string;
  date: Date;
  userId?: string;
  isGroup?: boolean;
  groupName?: string;
  shareAmount?: number;
};

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  const fetchExpenses = async () => {
    if (!user) return;

    try {
      // Get start and end of selected month
      const startOfMonth = new Date(selectedYear, selectedMonth, 1);
      const endOfMonth = new Date(
        selectedYear,
        selectedMonth + 1,
        0,
        23,
        59,
        59
      );

      // Fetch personal expenses
      const personalExpensesQuery = query(
        collection(db, "expenses"),
        where("userId", "==", user.uid),
        where("date", ">=", Timestamp.fromDate(startOfMonth)),
        where("date", "<=", Timestamp.fromDate(endOfMonth)),
        orderBy("date", "desc")
      );

      // Fetch group expenses where user is involved
      const groupExpensesQuery = query(
        collection(db, "groupExpenses"),
        where("splitBetween", "array-contains", user.email),
        where("date", ">=", Timestamp.fromDate(startOfMonth)),
        where("date", "<=", Timestamp.fromDate(endOfMonth))
      );

      const [personalSnapshot, groupSnapshot] = await Promise.all([
        getDocs(personalExpensesQuery),
        getDocs(groupExpensesQuery),
      ]);

      const personalExpenses = personalSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        isGroup: false,
      })) as Expense[];

      // Process group expenses
      const groupExpenses = await Promise.all(
        groupSnapshot.docs.map(async (expenseDoc) => {
          const expenseData = expenseDoc.data();
          const shareAmount =
            expenseData.amount / expenseData.splitBetween.length;

          // Get group name
          const groupRef = firestoreDoc(db, "groups", expenseData.groupId);
          const groupDoc = await getDoc(groupRef);
          const groupName = groupDoc.exists()
            ? groupDoc.data().name
            : "Unknown Group";

          return {
            id: expenseDoc.id,
            amount: expenseData.amount,
            description: expenseData.description,
            date: expenseData.date.toDate(),
            isGroup: true,
            groupName,
            shareAmount,
          } as Expense;
        })
      );

      // Combine and sort all expenses
      const allExpenses = [...personalExpenses, ...groupExpenses].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      );

      setExpenses(allExpenses);
      setError("");
    } catch (err) {
      console.error("Error fetching expenses:", err);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch and month change listener
  useEffect(() => {
    fetchExpenses();

    // Check for month change
    const interval = setInterval(() => {
      const now = new Date();
      if (
        now.getMonth() !== selectedMonth &&
        now.getFullYear() === selectedYear &&
        selectedMonth === now.getMonth() - 1
      ) {
        setSelectedMonth(now.getMonth());
        fetchExpenses();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [selectedMonth, selectedYear, expenses]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchExpenses();
  }, [selectedMonth, selectedYear]);

  const handleLongPressExpense = (expense: Expense) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(firestoreDoc(db, "expenses", expense.id));
              Alert.alert("Success", "Expense deleted successfully");
            } catch (error) {
              console.error("Error deleting expense:", error);
              Alert.alert("Error", "Failed to delete expense");
            }
          },
        },
      ]
    );
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => {
      if (expense.isGroup) {
        return sum + (expense.shareAmount || 0);
      }
      return sum + expense.amount;
    }, 0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <Link href="/add-expense" asChild>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </Link>
      </View>

      <TouchableOpacity
        style={styles.monthSelector}
        onPress={() => setShowMonthPicker(true)}
      >
        <Text style={styles.monthText}>
          {months[selectedMonth]} {selectedYear}
        </Text>
        <Ionicons name="calendar" size={24} color={Colors.primary} />
      </TouchableOpacity>

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Expenses</Text>
        <Text style={styles.totalAmount}>
          {getTotalExpenses().toFixed(2)} kr
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No expenses this month</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap the + button to add your first expense
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              title="Pull to refresh"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.expenseItem,
                item.isGroup && styles.groupExpenseItem,
              ]}
              onLongPress={() => !item.isGroup && handleLongPressExpense(item)}
              delayLongPress={500}
            >
              <View>
                {item.isGroup ? (
                  <>
                    <Text style={styles.groupName}>{item.groupName}</Text>
                    <Text style={styles.expenseDescription}>
                      {item.description}
                    </Text>
                    <Text style={styles.shareAmount}>
                      Your share: ${item.shareAmount?.toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.expenseCategory}>{item.category}</Text>
                    <Text style={styles.expenseDescription}>
                      {item.description}
                    </Text>
                  </>
                )}
                <Text style={styles.expenseDate}>
                  {item.date.toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.expenseAmount}>
                  {item.amount.toFixed(2)} kr
                </Text>
                {item.isGroup && (
                  <Text style={styles.groupTag}>Group Expense</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Month</Text>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(itemValue) =>
                  setSelectedMonth(Number(itemValue))
                }
                style={styles.picker}
              >
                {months.map((month, index) => (
                  <Picker.Item key={month} label={month} value={index} />
                ))}
              </Picker>

              <Picker
                selectedValue={selectedYear}
                onValueChange={(itemValue) =>
                  setSelectedYear(Number(itemValue))
                }
                style={styles.picker}
              >
                {years.map((year) => (
                  <Picker.Item
                    key={year.toString()}
                    label={year.toString()}
                    value={year}
                  />
                ))}
              </Picker>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowMonthPicker(false);
                fetchExpenses();
              }}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.black,
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text,
  },
  expenseItem: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: "bold",
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
  expenseAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    fontSize: 18,
    fontWeight: "bold",
    color: "red",
    textAlign: "center",
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.primary,
  },
  totalContainer: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
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
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContent: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  picker: {
    flex: 1,
    height: 150,
  },
  modalButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
  },
  modalButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  groupExpenseItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  groupName: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 4,
  },
  shareAmount: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 2,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  groupTag: {
    fontSize: 10,
    color: "#007AFF",
    marginTop: 4,
  },
});
