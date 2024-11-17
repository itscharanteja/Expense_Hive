import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/auth";
import { Ionicons } from "@expo/vector-icons";

export default function AddGroupTask() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !id) return;

    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title");
      return;
    }

    try {
      setIsSubmitting(true);
      const taskData = {
        title: title.trim(),
        assignedTo: user.email, // You'll need to implement member selection
        completed: false,
        dueDate: Timestamp.now(), // You'll need to implement date selection
        groupId: id,
        createdBy: user.email,
        createdAt: Timestamp.now(),
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Group Task</Text>
        <View style={{ width: 24 }} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Task Title"
        value={title}
        onChangeText={setTitle}
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Adding..." : "Add Task"}
        </Text>
      </TouchableOpacity>
    </View>
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
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
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
