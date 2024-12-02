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

    if (!newGroupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    try {
      setIsSubmitting(true);
      const initialMembers = [user.email, ...selectedMembers];

      const groupRef = await addDoc(collection(db, "groups"), {
        name: newGroupName.trim(),
        createdBy: user.email,
        members: initialMembers,
        createdAt: Timestamp.now(),
      });

      const batch = writeBatch(db);
      selectedMembers.forEach((memberEmail) => {
        const notificationRef = doc(collection(db, "notifications"));
        batch.set(notificationRef, {
          type: "GROUP_ADDITION",
          groupId: groupRef.id,
          groupName: newGroupName.trim(),
          createdBy: user.email,
          createdByUsername: userData.username,
          recipientEmail: memberEmail,
          createdAt: Timestamp.now(),
          read: false,
        });
      });

      await batch.commit();

      // Reset form and close modal
      setNewGroupName("");
      setSelectedMembers([]);
      setModalVisible(false);

      // Navigate to new group
      router.push({
        pathname: "/(group)/[id]",
        params: { id: groupRef.id },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create group");
      console.error("Error creating group:", error);
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
        ListEmptyComponent={
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#007AFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 20,
  },
  groupItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: "#666",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  formContainer: {
    padding: 20,
    gap: 15,
  },
  memberInputContainer: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  addMemberButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    justifyContent: "center",
  },
  membersContainer: {
    gap: 8,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 20,
  },
  memberEmail: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  createButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
  },
});
