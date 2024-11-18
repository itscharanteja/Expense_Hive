import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { Ionicons } from "@expo/vector-icons";

export default function EditGroupExpense() {
  const params = useLocalSearchParams();
  const { groupId, expenseId, initialAmount, initialDescription } = params;
  const [amount, setAmount] = useState(initialAmount as string);
  const [description, setDescription] = useState(initialDescription as string);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpense = async () => {
      if (!expenseId) return;

      try {
        const expenseRef = doc(db, "groupExpenses", expenseId as string);
        const expenseDoc = await getDoc(expenseRef);

        if (expenseDoc.exists()) {
          const data = expenseDoc.data();
          setAmount(data.amount.toString());
          setDescription(data.description);
        } else {
          Alert.alert("Error", "Expense not found");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching expense:", error);
        Alert.alert("Error", "Failed to load expense details");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [expenseId]);

  const handleUpdate = async () => {
    if (!expenseId || !groupId) {
      Alert.alert("Error", "Invalid expense or group ID");
      return;
    }

    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    try {
      setIsSubmitting(true);
      const expenseRef = doc(db, "groupExpenses", expenseId as string);

      const expenseDoc = await getDoc(expenseRef);
      if (!expenseDoc.exists()) {
        throw new Error("Expense not found");
      }

      const currentData = expenseDoc.data();
      await updateDoc(expenseRef, {
        amount: Number(amount),
        description: description.trim(),
        groupId: currentData.groupId,
        paidBy: currentData.paidBy,
        splitBetween: currentData.splitBetween,
        date: currentData.date,
        settled: currentData.settled,
      });

      Alert.alert("Success", "Expense updated successfully", [
        {
          text: "OK",
          onPress: () => router.push(`/(group)/${groupId}`),
        },
      ]);
    } catch (error: any) {
      console.error("Error updating expense:", error);
      Alert.alert(
        "Error",
        error.message === "Expense not found"
          ? "This expense no longer exists"
          : "Failed to update expense"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(`/(group)/${groupId}`)}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Group Expense</Text>
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

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleUpdate}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Updating..." : "Update Expense"}
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
});
