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
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/auth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Timestamp } from "firebase/firestore";

type Notification = {
  id: string;
  type: string;
  groupId: string;
  groupName: string;
  addedBy: string;
  addedByUsername: string;
  recipientEmail: string;
  createdAt: Date;
  read: boolean;
  readAt?: Date;
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
        createdAt: doc.data().createdAt.toDate(),
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

      // Set a timeout to delete the notification after 5 minutes
      setTimeout(async () => {
        try {
          await deleteDoc(doc(db, "notifications", notification.id));
        } catch (error) {
          console.error("Error deleting notification:", error);
        }
      }, 5 * 60 * 1000); // 5 minutes in milliseconds

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

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name="people"
          size={24}
          color={item.read ? "#666" : "#007AFF"}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>
          You have been added to{" "}
          <Text style={styles.boldText}>{item.groupName}</Text> by{" "}
          <Text style={styles.boldText}>@{item.addedByUsername}</Text>
        </Text>
        <Text style={styles.timeText}>
          {item.createdAt.toLocaleDateString()}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "white",
    alignItems: "center",
  },
  unreadNotification: {
    backgroundColor: "#f8f9ff",
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  boldText: {
    fontWeight: "600",
  },
  timeText: {
    fontSize: 12,
    color: "#666",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
    marginLeft: 8,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#666",
    fontSize: 16,
  },
});
