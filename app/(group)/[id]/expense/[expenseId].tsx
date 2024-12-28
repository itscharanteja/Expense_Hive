import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  doc,
  getDoc,
  deleteDoc,
  getDocs,
  collection,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/auth";
import ImageViewer from "react-native-image-zoom-viewer";

type ExpenseDetails = {
  id: string;
  amount: number;
  description: string;
  date: Date;
  paidBy: string;
  splitBetween: string[];
  receiptId?: string;
  paidMembers?: string[];
  settled: boolean;
};

export default function ExpenseDetails() {
  const { id, expenseId } = useLocalSearchParams();
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<ExpenseDetails | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [memberUsernames, setMemberUsernames] = useState<{
    [key: string]: string;
  }>({});
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);

  useEffect(() => {
    const fetchExpenseAndUsernames = async () => {
      try {
        const expenseDoc = await getDoc(
          doc(db, "groupExpenses", expenseId as string)
        );
        if (expenseDoc.exists()) {
          const expenseData = expenseDoc.data();
          setExpense({
            id: expenseDoc.id,
            ...expenseData,
            date: expenseData.date.toDate(),
            paidMembers: expenseData.paidMembers || [],
            settled: expenseData.settled,
          } as ExpenseDetails);

          const usersSnap = await getDocs(collection(db, "users"));
          const usernamesMap: { [key: string]: string } = {};
          usersSnap.docs.forEach((doc) => {
            const data = doc.data();
            if (data.email) {
              usernamesMap[data.email] = data.username;
            }
          });
          setMemberUsernames(usernamesMap);

          if (expenseData.receiptId) {
            const receiptDoc = await getDoc(
              doc(db, "receipts", expenseData.receiptId)
            );
            if (receiptDoc.exists()) {
              setReceipt(receiptDoc.data().imageData);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching expense details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenseAndUsernames();
  }, [expenseId]);

  const getUsername = (email: string) => {
    return memberUsernames[email] ? `@${memberUsernames[email]}` : email;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Expense not found</Text>
      </View>
    );
  }

  const amountPerPerson = expense.amount / expense.splitBetween.length;

  const togglePaidStatus = async (email: string) => {
    try {
      const expenseRef = doc(db, "groupExpenses", expenseId as string);

      // Get current paidMembers array or empty array if it doesn't exist
      const currentPaidMembers = expense?.paidMembers || [];

      // Toggle the member's paid status
      const updatedPaidMembers = currentPaidMembers.includes(email)
        ? currentPaidMembers.filter((member) => member !== email)
        : [...currentPaidMembers, email];

      // Update Firestore
      await updateDoc(expenseRef, {
        paidMembers: updatedPaidMembers,
      });

      // Update local state
      setExpense((expense) =>
        expense
          ? {
              ...expense,
              paidMembers: updatedPaidMembers,
            }
          : null
      );
    } catch (error) {
      console.error("Error toggling paid status:", error);
      Alert.alert("Error", "Failed to update payment status");
    }
  };

  const toggleExpenseStatus = async () => {
    try {
      await updateDoc(doc(db, "groupExpenses", expenseId as string), {
        settled: !expense?.settled,
      });

      // Update local state
      if (expense) {
        setExpense({
          ...expense,
          settled: !expense.settled,
        });
      }

      Alert.alert(
        "Success",
        `Expense marked as ${expense?.settled ? "unsettled" : "settled"}`
      );
    } catch (error) {
      console.error("Error toggling expense status:", error);
      Alert.alert("Error", "Failed to update expense status");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Expense Details Card */}
          <View style={styles.card}>
            <Text style={styles.description}>{expense.description}</Text>
            <Text style={styles.amount}>{expense.amount.toFixed(2)} kr</Text>
            <View style={styles.expenseMetaContainer}>
              <Text style={styles.date}>
                {expense.date.toLocaleDateString()}
              </Text>
              <View style={styles.creatorTag}>
                <Ionicons name="person-outline" size={14} color="#007AFF" />
                <Text style={styles.creatorText}>
                  Added by {getUsername(expense.paidBy)}
                </Text>
              </View>
            </View>
            <Text style={styles.paidBy}>
              Paid by {getUsername(expense.paidBy)}
            </Text>
          </View>

          {/* Split Details Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Split Details</Text>
            <View style={styles.splitInfo}>
              <Text style={styles.splitTotal}>
                Total Amount: {expense?.amount.toFixed(2)} kr
              </Text>
              <Text style={styles.splitPerPerson}>
                Amount per person:{" "}
                {(
                  (expense?.amount || 0) / (expense?.splitBetween?.length || 1)
                ).toFixed(2)}{" "}
                kr
              </Text>
            </View>

            <View style={styles.membersList}>
              {expense?.splitBetween.map((email) => (
                <View key={email} style={styles.memberRow}>
                  <View style={styles.memberInfo}>
                    <Text
                      style={styles.memberEmail}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {getUsername(email)}
                    </Text>
                    <Text style={styles.memberAmount}>
                      {(
                        (expense?.amount || 0) /
                        (expense?.splitBetween?.length || 1)
                      ).toFixed(2)}{" "}
                      kr
                    </Text>
                  </View>
                  {email === expense?.paidBy ? (
                    <View style={styles.paidIndicator}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#34C759"
                      />
                      <Text style={styles.paidText}>Paid</Text>
                    </View>
                  ) : email === user?.email ? (
                    <TouchableOpacity
                      style={[
                        styles.paidButton,
                        expense?.paidMembers?.includes(email) &&
                          styles.paidButtonActive,
                      ]}
                      onPress={() => togglePaidStatus(email)}
                    >
                      <Text
                        style={[
                          styles.paidButtonText,
                          expense?.paidMembers?.includes(email) &&
                            styles.paidButtonTextActive,
                        ]}
                      >
                        {expense?.paidMembers?.includes(email)
                          ? "Paid"
                          : "Mark as Paid"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    expense?.paidMembers?.includes(email) && (
                      <View style={styles.paidIndicator}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#34C759"
                        />
                        <Text style={styles.paidText}>Paid</Text>
                      </View>
                    )
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Receipt Card */}
          {receipt && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Receipt</Text>
              <TouchableOpacity
                onPress={() => setIsImageFullScreen(true)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: receipt }}
                  style={styles.receiptImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Delete Button */}
          {expense.paidBy === user?.email && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
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
                          if (expense.receiptId) {
                            await deleteDoc(
                              doc(db, "receipts", expense.receiptId)
                            );
                          }
                          await deleteDoc(
                            doc(db, "groupExpenses", expenseId as string)
                          );
                          Alert.alert(
                            "Success",
                            "Expense deleted successfully"
                          );
                          router.back();
                        } catch (error) {
                          console.error("Error deleting expense:", error);
                          Alert.alert("Error", "Failed to delete expense");
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.deleteButtonText}>Delete Expense</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Add Modal for full-screen image */}
      <Modal
        visible={isImageFullScreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageFullScreen(false)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsImageFullScreen(false)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <ImageViewer
            imageUrls={[{ url: receipt || "" }]}
            enableSwipeDown
            onSwipeDown={() => setIsImageFullScreen(false)}
            renderIndicator={() => <></>}
            maxOverflow={0}
            saveToLocalByLongPress={false}
            style={styles.fullScreenImage}
            backgroundColor="rgba(0, 0, 0, 0.95)"
            renderImage={(props) => (
              <Image
                {...props}
                style={styles.zoomedImage}
                resizeMode="contain"
              />
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flex: 1,
    paddingTop: 4, // Decreased from 8 to 4
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 4, // Decreased from 6 to 4
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4, // Decreased from 8 to 4
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16, // Add top padding
  },
  scrollContent: {
    paddingTop: 12, // Add padding to scroll content
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginTop: 8, // Add top margin to first card
  },
  description: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  amount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 8,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  expenseMetaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  date: {
    fontSize: 14,
    color: "#666",
  },
  paidBy: {
    fontSize: 14,
    color: "#666",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginHorizontal: 20,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  splitInfo: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  splitTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 4,
  },
  splitPerPerson: {
    fontSize: 14,
    color: "#666",
  },
  membersList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  memberInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 16,
    maxWidth: "65%",
  },
  memberEmail: {
    fontSize: 16,
    color: "#333",
    flex: 1,
    marginRight: 12,
    flexShrink: 1,
  },
  memberAmount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007AFF",
    minWidth: 80,
    textAlign: "right",
  },
  receiptImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
  },
  creatorTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  creatorText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  paidButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  paidButtonActive: {
    backgroundColor: "#34C759",
  },
  paidButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  paidButtonTextActive: {
    color: "white",
  },
  paidIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8FAE8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  paidText: {
    fontSize: 14,
    color: "#34C759",
    fontWeight: "500",
  },
  settleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  unsettleButton: {
    backgroundColor: "#34C759",
  },
  settleButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    paddingHorizontal: 20,
  },
  fullScreenImage: {
    flex: 1,
  },
  zoomedImage: {
    width: "100%",
    height: "90%",
    alignSelf: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 2,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
});
