export const ExpenseCard = ({ amount, ...props }) => {
  return (
    <View style={styles.card}>
      {/* ... other content ... */}
      <Text style={styles.amount}>{amount.toFixed(2)} kr</Text>
    </View>
  );
};
