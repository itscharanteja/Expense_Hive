import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications should be presented when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // Show alert even when app is in foreground
    shouldPlaySound: true,      // Play sound for notifications
    shouldSetBadge: true,       // Show badge count on app icon
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;
 
  try {
    console.log('Checking if device is physical:', Device.isDevice);
  
    if (Device.isDevice) {
      console.log('Checking existing permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      console.log('Existing permission status:', existingStatus);
      
      if (existingStatus !== 'granted') {
        console.log('Requesting permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('New permission status:', status);
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permission not granted');
        alert('Failed to get push token for push notification!');
        return;
      }

      console.log('Getting push token...');
      // For Expo Go, we don't need projectId
      token = await Notifications.getExpoPushTokenAsync({

        experienceId: '@anonymous/ExpHive'  // This should match your app slug
      });
      
      console.log('Push token:', token.data);
    } else {
      console.log('Not a physical device');
      alert('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      console.log('Setting up Android channel...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token?.data;
  } catch (error) {
    console.error('Error in registerForPushNotificationsAsync:', error);
    alert('Error setting up notifications: ' + error.message);
    return null;
  }
}

// Function to send a local notification (for testing)
export async function sendLocalNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // null means show immediately
  });
}

// Function to handle received notifications
export function addNotificationListener(callback) {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
}

// Function to handle notifications when app is opened from a notification
export function addNotificationResponseListener(callback) {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
}
