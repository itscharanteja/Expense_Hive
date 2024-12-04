import axios from "axios";

// Get the push token from command line argument
// const EXPO_PUSH_TOKEN = process.argv[2];

// if (!EXPO_PUSH_TOKEN) {
//   console.error("Please provide your Expo Push Token as an argument");
//   process.exit(1);
// }

export async function sendPushNotification(body, userToken) {
  try {
    const message = {
      to: userToken,
      sound: "default",
      title: "ExpHive Notification",
      body: body,
      data: { someData: "goes here" },
    };

    const response = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      message,
      {
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Notification sent successfully!");
    console.log("Response:", response.data);
  } catch (error) {
    console.error(
      "Error sending notification:",
      error.response?.data || error.message
    );
  }
}

// Execute the function
sendPushNotification();
