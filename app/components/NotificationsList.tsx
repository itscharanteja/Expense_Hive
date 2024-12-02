import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
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
import { GestureHandlerRootView } from "react-native-gesture-handler";

type Notification = {
  id: string;
  type: "GROUP_ADDITION" | "GROUP_DELETION" | "GROUP_EXPENSE" | "TASK_ASSIGNED";
  groupId: string;
  groupName: string;
  addedBy?: string;
  addedByUsername?: string;
  deletedByUsername?: string;
  recipientEmail: string;
  recipientId: string;
  amount?: number;
  description?: string;
  title?: string;
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
        return `You were added to ${item.groupName} by ${item.addedByUsername}`;
      case "GROUP_DELETION":
        return `${item.groupName} was deleted by ${item.deletedByUsername}`;
      case "GROUP_EXPENSE":
        return `New expense: ${item.amount}kr - ${item.description}`;
      case "TASK_ASSIGNED":
        return `New task assigned: ${item.title}`;
      default:
        return item.type;
    }
  };

  return (
    <View style={styles.notificationItem}>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationType}>{getNotificationContent()}</Text>
        <Text style={styles.notificationTime}>
          {item.createdAt?.toDate().toLocaleString()}
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
      {!item.read && <View style={styles.unreadDot} />}
    </View>
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

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Fetch will happen automatically via useEffect
    setRefreshing(false);
  }, []);

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      </GestureHandlerRootView>
    </>
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
    backgroundColor: "white",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
  notificationDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
    marginLeft: 8,
  },
  listContainer: {
    flexGrow: 1,
  },
  deleteAction: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },
  deleteActionContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  deleteActionText: {
    color: "white",
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    marginLeft: 8,
  },
});
