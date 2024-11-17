import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { collection, addDoc, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/auth";
import { Ionicons } from "@expo/vector-icons";

type Member = {
  email: string;
  selected: boolean;
};

export default function AddGroupExpense() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  // Fetch group members when component mounts
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!id) return;
      try {
        const groupDoc = await getDoc(doc(db, "groups", id as string));
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          // Initialize all members as selected, including the current user
          const membersList = groupData.members.map((email: string) => ({
            email,
            selected: true, // Default all members as selected
          }));
          setMembers(membersList);
        }
      } catch (error) {
        console.error("Error fetching group members:", error);
        Alert.alert("Error", "Failed to load group members");
      }
    };

    fetchGroupMembers();
  }, [id]);

  const toggleMemberSelection = (email: string) => {
    setMembers(
      members.map((member) =>
        member.email === email
          ? { ...member, selected: !member.selected }
          : member
      )
    );
  };

  const getSelectedMembers = () =>
    members.filter((member) => member.selected).map((member) => member.email);

  const handleSubmit = async () => {
    if (!user || !id) return;

    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    const selectedMembers = getSelectedMembers();
    if (selectedMembers.length === 0) {
      Alert.alert("Error", "Please select at least one member to split with");
      return;
    }

    try {
      setIsSubmitting(true);
      const expenseData = {
        amount: Number(amount),
        description: description.trim(),
        date: Timestamp.now(),
        paidBy: user.email,
        groupId: id,
        splitBetween: selectedMembers,
        settled: false,
      };

      await addDoc(collection(db, "groupExpenses"), expenseData);
      Alert.alert("Success", "Expense added successfully");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add expense");
      console.error("Error adding expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Group Expense</Text>
        <View style={{ width: 24 }} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.sectionTitle}>Split Between</Text>
      <View style={styles.membersContainer}>
        {members.map((member) => (
          <TouchableOpacity
            key={member.email}
            style={[
              styles.memberChip,
              member.selected && styles.memberChipSelected,
            ]}
            onPress={() => toggleMemberSelection(member.email)}
          >
            <Text
              style={[
                styles.memberEmail,
                member.selected && styles.memberEmailSelected,
              ]}
            >
              {member.email}
            </Text>
            <Ionicons
              name={member.selected ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={member.selected ? "white" : "#007AFF"}
            />
          </TouchableOpacity>
        ))}
      </View>

      {members.length > 0 && (
        <View style={styles.splitInfo}>
          <Text style={styles.splitInfoText}>
            Amount per person: $
            {(Number(amount || 0) / getSelectedMembers().length).toFixed(2)}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Adding..." : "Add Expense"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  membersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 20,
    gap: 8,
  },
  memberChipSelected: {
    backgroundColor: "#007AFF",
  },
  memberEmail: {
    color: "#333",
  },
  memberEmailSelected: {
    color: "white",
  },
  splitInfo: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  splitInfoText: {
    fontSize: 16,
    textAlign: "center",
    color: "#007AFF",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
