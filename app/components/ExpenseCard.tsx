import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ExpenseCardProps = {
  description: string;
  amount: number;
  date: Date;
  paidBy: string;
  onPress?: () => void;
  onLongPress?: () => void;
};

const ExpenseCard: React.FC<ExpenseCardProps> = ({
  description,
  amount,
  date,
  paidBy,
  onPress,
  onLongPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.date}>{date.toLocaleDateString()}</Text>
        <Text style={styles.paidBy}>Paid by {paidBy}</Text>
      </View>
      <Text style={styles.amount}>{amount.toFixed(2)} kr</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  description: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  paidBy: {
    fontSize: 14,
    color: "#007AFF",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ExpenseCard;
