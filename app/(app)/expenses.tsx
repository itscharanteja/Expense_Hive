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
  Dimensions,
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
import { LinearGradient } from 'expo-linear-gradient';

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

type CalendarDay = {
  date: number;
  isCurrentMonth: boolean;
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
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthGrid, setShowMonthGrid] = useState(false);
  const [yearRange, setYearRange] = useState({
    start: 2018,
    end: 2029
  });
  const [yearPageIndex, setYearPageIndex] = useState(0);
  const YEARS_PER_PAGE = 12;
  const [yearPage, setYearPage] = useState(0);
  const [showYearGrid, setShowYearGrid] = useState(false);

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
    { length: 12 },
    (_, i) => 2018 + i
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

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const toggleYearPicker = () => {
    setShowYearPicker(!showYearPicker);
  };

  const handleDateSelect = (day: number) => {
    setSelectedDate(day);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setShowMonthGrid(false);
  };

  const getYearRangeForPage = (pageIndex: number) => {
    const startYear = yearRange.start + (pageIndex * YEARS_PER_PAGE);
    return Array.from(
      { length: YEARS_PER_PAGE }, 
      (_, i) => startYear + i
    ).filter(year => year >= yearRange.start && year <= yearRange.end);
  };

  const handleYearSwipe = (direction: 'next' | 'prev') => {
    if (direction === 'next' && (yearPageIndex + 1) * YEARS_PER_PAGE < yearRange.end) {
      setYearPageIndex(yearPageIndex + 1);
    } else if (direction === 'prev' && yearPageIndex > 0) {
      setYearPageIndex(yearPageIndex - 1);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primary + '40', Colors.accent + '20']}
      style={styles.gradientBackground}
    >
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
          <View style={styles.monthSelectorContent}>
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} style={styles.calendarIcon} />
            <Text style={styles.monthText}>
              {months[selectedMonth]} {selectedYear}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={24} color={Colors.primary} />
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
              <View style={styles.monthNavigator}>
                <TouchableOpacity onPress={showYearGrid ? () => setYearPage(yearPage - 1) : handlePrevMonth} disabled={showYearGrid ? yearPage === 0 : selectedMonth === 0}>
                  <Ionicons name="chevron-back" size={24} color={(showYearGrid ? yearPage === 0 : selectedMonth === 0) ? '#666' : 'white'} />
                </TouchableOpacity>
                <View style={styles.dateSelector}>
                  <TouchableOpacity onPress={() => setShowYearGrid(false)}>
                    <Text style={styles.modalTitle}>{months[selectedMonth]}</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitleDivider}>/</Text>
                  <TouchableOpacity onPress={() => setShowYearGrid(true)}>
                    <Text style={styles.modalTitle}>{selectedYear}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={showYearGrid ? () => setYearPage(yearPage + 1) : handleNextMonth} disabled={showYearGrid ? (2000 + (yearPage + 1) * YEARS_PER_PAGE) > new Date().getFullYear() : selectedMonth === 11}>
                  <Ionicons name="chevron-forward" size={24} color={(showYearGrid ? (2000 + (yearPage + 1) * YEARS_PER_PAGE) > new Date().getFullYear() : selectedMonth === 11) ? '#666' : 'white'} />
                </TouchableOpacity>
              </View>

              {showYearGrid ? (
                <View style={styles.yearGrid}>
                  {Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
                    const year = 2001 + i + yearPage * YEARS_PER_PAGE;
                    if (year > new Date().getFullYear()) return null;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearItem,
                          year === selectedYear && styles.selectedYear
                        ]}
                        onPress={() => {
                          setSelectedYear(year);
                          setShowYearGrid(false);
                        }}
                      >
                        <Text style={[
                          styles.yearText,
                          year === selectedYear && styles.selectedYearText
                        ]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.monthGrid}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.monthItem,
                        index === selectedMonth && styles.selectedMonth
                      ]}
                      onPress={() => {
                        setSelectedMonth(index);
                        setShowMonthPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.monthItemText,
                        index === selectedMonth && styles.selectedMonthText
                      ]}>
                        {month.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const today = new Date();
                  setSelectedYear(today.getFullYear());
                  setSelectedMonth(today.getMonth());
                  setShowMonthPicker(false);
                }}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: Colors.white,

    padding: 20,
    paddingTop: 60,
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
  monthSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  calendarIcon: {
    marginRight: 8,
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
    backgroundColor: '#2C2C2E',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    alignSelf: 'center',
    marginTop: 100,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: 'white',
    textAlign: "center",
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  dayHeader: {
    color: '#8E8E93',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  calendarDayText: {
    color: 'white',
    fontSize: 16,
  },
  currentDay: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  currentDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
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
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateToggle: {
    padding: 8,
    borderRadius: 8,
  },
  dateToggleActive: {
    backgroundColor: Colors.primary + '40',
  },
  modalTitleDivider: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  yearNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  yearNavButton: {
    padding: 10,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  yearItem: {
    width: '30%',
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 8,
  },
  selectedYear: {
    backgroundColor: Colors.primary,
  },
  yearText: {
    color: 'white',
    fontSize: 16,
  },
  selectedYearText: {
    fontWeight: 'bold',
  },
  selectedDay: {
    backgroundColor: Colors.primary + '80',
    borderRadius: 20,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  monthItem: {
    width: '25%', // 4 months per row
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 8,
  },
  selectedMonth: {
    backgroundColor: Colors.primary,
  },
  monthItemText: {
    color: 'white',
    fontSize: 16,
  },
  selectedMonthText: {
    fontWeight: 'bold',
  },
  disabledYear: {
    opacity: 0.5,
  },
  disabledYearText: {
    color: '#666666',
  },
  todayButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  todayButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  gradientBackground: {
    flex: 1,
  },
});
