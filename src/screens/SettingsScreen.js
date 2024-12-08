import { SafeAreaView } from 'react-native-safe-area-context';
// ... other imports

const SettingsScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Existing content */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 