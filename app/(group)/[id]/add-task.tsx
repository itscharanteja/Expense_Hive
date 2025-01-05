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
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/auth";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";

type Member = {
  email: string;
  username: string;
};

export default function AddGroupTask() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!id) return;
      try {
        const groupDoc = await getDoc(doc(db, "groups", id as string));
        if (groupDoc.exists()) {
          const members = groupDoc.data().members;

          const membersWithUsernames: Member[] = [];
          for (const email of members) {
            const userQuery = query(
              collection(db, "users"),
              where("email", "==", email)
            );
            const userSnapshot = await getDocs(userQuery);
            if (!userSnapshot.empty) {
              membersWithUsernames.push({
                email: email,
                username: userSnapshot.docs[0].data().username,
              });
            }
          }
          setGroupMembers(membersWithUsernames);
        }
      } catch (error) {
        console.error("Error fetching group members:", error);
        Alert.alert("Error", "Failed to load group members");
      }
    };

    fetchGroupMembers();
  }, [id]);

  const handleSubmit = async () => {
    if (!user || !id) return;

    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title");
      return;
    }

    if (!selectedMember) {
      Alert.alert("Error", "Please select a member to assign the task");
      return;
    }

    try {
      setIsSubmitting(true);
      const taskData = {
        title: title.trim(),
        assignedTo: selectedMember,
        dueDate: Timestamp.fromDate(selectedDate),
        completed: false,
        createdBy: user.email,
        groupId: id,
      };

      await addDoc(collection(db, "groupTasks"), taskData);
      Alert.alert("Success", "Task added successfully");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add task");
      console.error("Error adding task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Task</Text>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text
            style={[
              styles.doneButtonText,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            Done
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Task Title"
        value={title}
        onChangeText={setTitle}
      />

      {/* Member Selection */}
      <Text style={styles.sectionTitle}>Assign To</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.memberList}
      >
        {groupMembers.map((member) => (
          <TouchableOpacity
            key={member.email}
            style={[
              styles.memberButton,
              member.email === selectedMember && styles.memberButtonSelected,
            ]}
            onPress={() => setSelectedMember(member.email)}
          >
            <Text
              style={[
                styles.memberButtonText,
                member.email === selectedMember &&
                  styles.memberButtonTextSelected,
              ]}
            >
              @{member.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setDatePickerVisible(true)}
      >
        <Ionicons name="calendar-outline" size={20} color="#007AFF" />
        <Text style={styles.dateButtonText}>
          Due: {selectedDate.toLocaleDateString()}
        </Text>
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="datetime"
        onConfirm={(date) => {
          setSelectedDate(date);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
    marginHorizontal: -20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#666",
  },
  memberList: {
    marginBottom: 20,
  },
  memberButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  memberButtonSelected: {
    backgroundColor: "#E3F2FD",
    borderColor: "#007AFF",
  },
  memberButtonText: {
    fontSize: 14,
    color: "#666",
  },
  memberButtonTextSelected: {
    color: "#007AFF",
    fontWeight: "500",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: -10,
    marginBottom: 20,
  },
  doneButtonText: {
    color: "#34C759", // iOS green color
    fontSize: 17,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
