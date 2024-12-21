import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  onSnapshot,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/auth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../constants/Colors";

type Notification = {
  id: string;
  type:
    | "GROUP_ADDITION"
    | "GROUP_DELETION"
    | "GROUP_EXPENSE"
    | "TASK_ASSIGNED"
    | "GROUP_REMINDER";
  groupId: string;
  groupName: string;
  addedBy?: string;
  createdByUsername?: string;
  deletedByUsername?: string;
  recipientEmail: string;
  recipientId: string;
  amount?: number;
  description?: string;
  title?: string;
  dueDate?: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  read: boolean;
  readAt?: FirebaseFirestore.Timestamp;
};

const NotificationItem = ({
  item,
  onDelete,
}: {
  item: Notification;
  onDelete: () => void;
}) => {
  const getNotificationContent = () => {
    switch (item.type) {
      case "GROUP_ADDITION":
        return `You were added to ${item.groupName} by ${item.createdByUsername}`;
      case "GROUP_DELETION":
        return `${item.groupName} was deleted by ${item.deletedByUsername}`;
      case "GROUP_EXPENSE":
        return `New expense: ${item.amount}kr - ${item.description}`;
      case "TASK_ASSIGNED":
        return `New task assigned: ${item.title}`;
      case "GROUP_REMINDER":
        return `New reminder in ${item.groupName}: ${
          item.title
        } (Due: ${item.dueDate?.toDate().toLocaleString()})`;
      default:
        return item.type;
    }
  };

  return (
    <TouchableOpacity onPress={onDelete} style={styles.notificationItem}>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationType}>{getNotificationContent()}</Text>
        <Text style={styles.notificationTime}>
          {item.createdAt?.toDate().toLocaleString()}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

export default function NotificationsList() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    // Subscribe to notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("recipientEmail", "==", user.email),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];

      setNotifications(notificationsData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      await updateDoc(doc(db, "notifications", notification.id), {
        read: true,
        readAt: Timestamp.now(), // Add timestamp when notification was read
      });

      // Set a timeout to delete the notification after a short delay
      setTimeout(async () => {
        try {
          await deleteDoc(doc(db, "notifications", notification.id));
        } catch (error) {
          console.error("Error deleting notification:", error);
        }
      }, 2000); // 2 seconds delay

      // Navigate if it's a group notification
      if (notification.type === "GROUP_ADDITION") {
        router.push({
          pathname: "/(group)/[id]",
          params: { id: notification.groupId },
        });
      }
    } catch (error) {
      console.error("Error handling notification:", error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Fetch will happen automatically via useEffect
    setRefreshing(false);
  }, []);

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <NotificationItem
          item={item}
          onDelete={() => handleNotificationPress(item)}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.listContainer}
    />
  );
}

const styles = StyleSheet.create({
  notificationItem: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    alignItems: "center",
  },
  notificationContent: {
    flex: 1,
  },
  notificationType: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    marginLeft: 8,
  },
  listContainer: {
    flexGrow: 1,
  },
});
