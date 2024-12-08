import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

const ExpenseDetailsScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentContainer}>
        {/* Existing content */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 20,    // Adds space from the top
    paddingBottom: 20, // Adds space from the bottom
    marginHorizontal: 16, // Optional: adds horizontal padding
  },
}); 