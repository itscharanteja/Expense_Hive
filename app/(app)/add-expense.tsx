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
import { router } from "expo-router";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/auth";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from "../constants/Colors";
import DateTimePickerModal from "react-native-modal-datetime-picker";


const categories = [
  "Food & Drinks",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Other",
];

export default function AddExpense() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    const resetForm = () => {
      setAmount("");
      setCategory("");
      setDescription("");
      setIsSubmitting(false);
    };

    resetForm();
  }, []);

  const handleBack = () => {
    if (amount || description) {
      Alert.alert(
        "Discard Changes",
        "Are you sure you want to go back? Any unsaved changes will be lost.",
        [
          {
            text: "Stay",
            style: "cancel",
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const showDatePicker = () => {
    setDatePickerVisible(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisible(false);
  };

  const handleConfirm = (date: Date) => {
    setSelectedDate(date);
    hideDatePicker();
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!category) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const expenseData = {
        amount: Number(amount),
        category,
        description: description.trim(),
        date: Timestamp.fromDate(selectedDate),
        userId: user.uid,
        timestamp: Timestamp.now(),
      };

      await addDoc(collection(db, "expenses"), expenseData);
      Alert.alert("Success", "Expense added successfully");
      
      setAmount("");
      setCategory("");
      setDescription("");
      setSelectedDate(new Date());
      
      router.back();
    } catch (error) {
      console.error("Error adding expense:", error);
      Alert.alert("Error", "Failed to add expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={[
        '#F0F7FF',    // Soft sky blue
        '#F5FAFF',    // Lighter sky blue
        '#F8FCFF',    // Very light blue
        '#FFFFFF',    // White
      ]}
      locations={[0, 0.3, 0.6, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradientBackground}
    >
      <View style={styles.mainContainer}>
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Add Expense</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />


          <TouchableOpacity
            style={styles.dateButton}
            onPress={showDatePicker}
          >
            <View style={styles.dateButtonContent}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.dateButtonText}>
                {selectedDate.toLocaleDateString()}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleConfirm}
            onCancel={hideDatePicker}
            date={selectedDate}
            maximumDate={new Date()}
          />


          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
              itemStyle={{ fontSize: 16, height: 60 }}
            >
              <Picker.Item 
                label="Select Category" 
                value="" 
                style={{ color: '#666' }} 
              />
              {categories.map((cat) => (
                <Picker.Item 
                  key={cat} 
                  label={cat} 
                  value={cat}
                />
              ))}
            </Picker>
          </View>

          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? "Adding..." : "Add Expense"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingTop: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 16,
    paddingHorizontal: 0,
    position: 'relative',
  },
  backButton: {
    padding: 8,
    width: 40,
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
    textAlign: 'center',
    marginLeft: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    overflow: "hidden",
    backgroundColor: '#f8f8f8',
  },
  picker: {
    height: 60,
    padding: 10,
    fontSize: 16,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
});
