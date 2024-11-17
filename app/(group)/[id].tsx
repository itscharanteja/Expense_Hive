import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  Timestamp,
  updateDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/auth";

type GroupExpense = {
  id: string;
  amount: number;
  description: string;
  paidBy: string;
  splitBetween: string[];
  date: Date;
  settled: boolean;
};

type GroupTask = {
  id: string;
  title: string;
  assignedTo: string;
  completed: boolean;
  dueDate: Date;
};

type GroupDetails = {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
};

export default function GroupDetails() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    // Fetch group details
    const fetchGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, "groups", id as string));
        if (groupDoc.exists()) {
          setGroup({ id: groupDoc.id, ...groupDoc.data() } as GroupDetails);
        } else {
          Alert.alert("Error", "Group not found");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching group:", error);
        Alert.alert("Error", "Failed to load group details");
      }
    };

    // Listen to group expenses
    const expensesQuery = query(
      collection(db, "groupExpenses"),
      where("groupId", "==", id)
    );

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as GroupExpense[];
      setExpenses(expensesData);
      calculateBalances(expensesData);
    });

    // Listen to group tasks
    const tasksQuery = query(
      collection(db, "groupTasks"),
      where("groupId", "==", id)
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate.toDate(),
      })) as GroupTask[];
      setTasks(tasksData);
    });

    fetchGroup();
    setLoading(false);

    return () => {
      unsubscribeExpenses();
      unsubscribeTasks();
    };
  }, [id, user]);

  const calculateBalances = (groupExpenses: GroupExpense[]) => {
    const newBalances: Record<string, number> = {};

    groupExpenses.forEach((expense) => {
      if (expense.settled) return;

      const amountPerPerson = expense.amount / expense.splitBetween.length;
      expense.splitBetween.forEach((memberId) => {
        if (memberId === expense.paidBy) {
          newBalances[memberId] =
            (newBalances[memberId] || 0) + expense.amount - amountPerPerson;
        } else {
          newBalances[memberId] =
            (newBalances[memberId] || 0) - amountPerPerson;
        }
      });
    });

    setBalances(newBalances);
  };

  const toggleTaskStatus = async (taskId: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, "groupTasks", taskId), { completed });
    } catch (error) {
      console.error("Error updating task:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("email", "==", email.toLowerCase().trim())
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking user existence:", error);
      return false;
    }
  };

  const addMember = async () => {
    const email = newMemberEmail.toLowerCase().trim();

    if (!email) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    if (group?.members.includes(email)) {
      Alert.alert("Error", "This member is already in the group");
      return;
    }

    if (email === user?.email) {
      Alert.alert("Error", "You are already a member of this group");
      setNewMemberEmail("");
      return;
    }

    setAddingMember(true);

    try {
      const userExists = await checkUserExists(email);

      if (!userExists) {
        Alert.alert(
          "Error",
          "This user is not registered with ExpenseHive. Please invite them to join first."
        );
        setNewMemberEmail("");
      } else {
        // Update group members in Firestore
        const groupRef = doc(db, "groups", id as string);
        await updateDoc(groupRef, {
          members: arrayUnion(email),
        });
        setNewMemberEmail("");
        Alert.alert("Success", "Member added successfully");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (email: string) => {
    if (email === group?.createdBy) {
      Alert.alert("Error", "Cannot remove the group creator");
      return;
    }

    try {
      const groupRef = doc(db, "groups", id as string);
      await updateDoc(groupRef, {
        members: arrayRemove(email),
      });
      Alert.alert("Success", "Member removed successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to remove member");
    }
  };

  if (loading || !group) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{group.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Balances</Text>
        </View>
        {Object.entries(balances).map(([memberId, amount]) => (
          <View key={memberId} style={styles.balanceItem}>
            <Text>{memberId}</Text>
            <Text style={amount >= 0 ? styles.positive : styles.negative}>
              ${Math.abs(amount).toFixed(2)}{" "}
              {amount >= 0 ? "to receive" : "to pay"}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          <TouchableOpacity
            onPress={() => router.push(`/(group)/${id}/add-expense`)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.expenseItem}>
              <View>
                <Text style={styles.expenseDescription}>
                  {item.description}
                </Text>
                <Text style={styles.expenseDetails}>
                  Paid by {item.paidBy} • {item.date.toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>
                ${item.amount.toFixed(2)}
              </Text>
            </View>
          )}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <TouchableOpacity
            onPress={() => router.push(`/(group)/${id}/add-task`)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.taskItem}
              onPress={() => toggleTaskStatus(item.id, !item.completed)}
            >
              <Ionicons
                name={item.completed ? "checkbox" : "square-outline"}
                size={24}
                color="#007AFF"
              />
              <View style={styles.taskContent}>
                <Text
                  style={[
                    styles.taskTitle,
                    item.completed && styles.taskCompleted,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={styles.taskDetails}>
                  Assigned to {item.assignedTo} • Due{" "}
                  {item.dueDate.toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setMemberModalVisible(true)}
          >
            <Ionicons name="person-add" size={20} color="white" />
          </TouchableOpacity>
        </View>
        {group.members.map((email) => (
          <View key={email} style={styles.memberItem}>
            <Text style={styles.memberEmail}>{email}</Text>
            {email !== group.createdBy && user?.email === group.createdBy && (
              <TouchableOpacity
                onPress={() => removeMember(email)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            )}
            {email === group.createdBy && (
              <Text style={styles.adminBadge}>Admin</Text>
            )}
          </View>
        ))}
      </View>

      <Modal
        visible={memberModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMemberModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Member</Text>

            <View style={styles.memberInput}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Enter Member Email"
                value={newMemberEmail}
                onChangeText={setNewMemberEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!addingMember}
              />
              <TouchableOpacity
                style={[
                  styles.addMemberButton,
                  addingMember && styles.buttonDisabled,
                ]}
                onPress={addMember}
                disabled={addingMember}
              >
                {addingMember ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.addMemberButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setMemberModalVisible(false);
                setNewMemberEmail("");
              }}
            >
              <Text style={styles.buttonText}>Close</Text>
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
    padding: 20,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
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
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#007AFF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "white",
    borderRadius: 5,
    marginBottom: 5,
  },
  positive: {
    color: "green",
  },
  negative: {
    color: "red",
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "500",
  },
  expenseDetails: {
    fontSize: 14,
    color: "#666",
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskContent: {
    marginLeft: 10,
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  taskCompleted: {
    textDecorationLine: "line-through",
    color: "#666",
  },
  taskDetails: {
    fontSize: 14,
    color: "#666",
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberEmail: {
    flex: 1,
    fontSize: 16,
  },
  removeButton: {
    padding: 4,
  },
  adminBadge: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "bold",
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  memberInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
  },
  addMemberButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    minWidth: 60,
    alignItems: "center",
  },
  addMemberButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
