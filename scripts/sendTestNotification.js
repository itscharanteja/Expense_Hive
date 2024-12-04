import axios from "axios";

export async function sendPushNotification(body, userToken) {
  if (!userToken) {
    console.error("Push token is required");
    return;
  }

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
