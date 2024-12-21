import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import {
  collection,
  addDoc,
  writeBatch,
  doc,
  Timestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/auth";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { sendPushNotification } from "../../scripts/sendTestNotification";
import { Colors } from "../constants/Colors";
import { LinearGradient } from "expo-linear-gradient";

type Group = {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
};

export default function Groups() {
  const { user, userData } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [groups]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      const groupsQuery = query(
        collection(db, "groups"),
        where("members", "array-contains", user.email)
      );
      const snapshot = await getDocs(groupsQuery);
      const groupsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Group[];

      setGroups(groupsData);
    } catch (error) {
      console.error("Error fetching groups:", error);
      Alert.alert("Error", "Failed to load groups");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchGroups();
  }, []);

  const handleAddMember = () => {
    if (!newMemberEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    const email = newMemberEmail.toLowerCase().trim();
    if (selectedMembers.includes(email)) {
      Alert.alert("Error", "Member already added");
      return;
    }

    if (email === user?.email) {
      Alert.alert("Error", "You are already a member");
      return;
    }

    setSelectedMembers([...selectedMembers, email]);
    setNewMemberEmail("");
  };

  const handleCreateGroup = async () => {
    if (!user || !userData) return;

    try {
      console.log("Creating group with members:", selectedMembers);
      setIsSubmitting(true);
      const initialMembers = [user.email, ...selectedMembers];

      const groupRef = await addDoc(collection(db, "groups"), {
        name: newGroupName.trim(),
        createdBy: user.email,
        members: initialMembers,
        createdAt: Timestamp.now(),
      });

      const batch = writeBatch(db);
      for (const memberEmail of selectedMembers) {
        console.log("Processing member:", memberEmail);
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("email", "==", memberEmail));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          console.log("Found user document for:", memberEmail);
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          const recipientId = userDoc.id;

          const notificationRef = doc(collection(db, "notifications"));
          batch.set(notificationRef, {
            type: "GROUP_ADDITION",
            groupId: groupRef.id,
            groupName: newGroupName.trim(),
            createdBy: user.email,
            createdByUsername: userData.username,
            recipientEmail: memberEmail,
            recipientId,
            createdAt: Timestamp.now(),
            read: false,
          });

          if (userData.expoPushToken) {
            await sendPushNotification(
              `You were added to ${newGroupName.trim()}`,
              userData.expoPushToken
            );
          }
        }
      }

      await batch.commit();
      console.log("All notifications created successfully");

      setNewGroupName("");
      setSelectedMembers([]);
      setModalVisible(false);
      router.push({
        pathname: "/(group)/[id]",
        params: { id: groupRef.id },
      });
    } catch (error) {
      console.error("Error in group creation:", error);
      Alert.alert("Error", "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() =>
        router.push({
          pathname: "/(group)/[id]",
          params: { id: item.id },
        })
      }
    >
      <View>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.memberCount}>
          {item.members.length}{" "}
          {item.members.length === 1 ? "member" : "members"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#666" />
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={[Colors.primary + "30", Colors.accent + "10"]}
      style={styles.gradientBackground}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Groups</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              title="Pull to refresh"
            />
          }
          ListEmptyComponent={() =>
            !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No groups yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap the + button to create a group
                </Text>
              </View>
            )
          }
        />

        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create New Group</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter group name"
                value={newGroupName}
                onChangeText={setNewGroupName}
              />

              <View style={styles.memberInputContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Add member email"
                  value={newMemberEmail}
                  onChangeText={setNewMemberEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity
                  style={styles.addMemberButton}
                  onPress={handleAddMember}
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {selectedMembers.length > 0 && (
                <View style={styles.membersContainer}>
                  {selectedMembers.map((email) => (
                    <View key={email} style={styles.memberChip}>
                      <Text style={styles.memberEmail}>{email}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          setSelectedMembers((members) =>
                            members.filter((m) => m !== email)
                          )
                        }
                        style={styles.removeButton}
                      >
                        <Ionicons name="close" size={18} color="#666" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.createButton,
                  isSubmitting && styles.buttonDisabled,
                ]}
                onPress={handleCreateGroup}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? "Creating..." : "Create Group"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  list: {
    padding: 20,
  },
  groupItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#1a1a1a",
    paddingRight: 12,
  },
  memberCount: {
    fontSize: 15,
    color: "#666",
    paddingRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  formContainer: {
    padding: 24,
    gap: 20,
  },
  memberInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  addMemberButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  membersContainer: {
    gap: 10,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 12,
    borderRadius: 24,
  },
  memberEmail: {
    flex: 1,
    marginRight: 8,
    fontSize: 15,
    color: "#1a1a1a",
  },
  removeButton: {
    padding: 6,
  },
  createButton: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  gradientBackground: {
    flex: 1,
  },
});
