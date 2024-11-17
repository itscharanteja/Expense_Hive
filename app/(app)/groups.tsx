import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/auth";
import { router } from "expo-router";

type Group = {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
};

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const groupsQuery = query(
      collection(db, "groups"),
      where("members", "array-contains", user.email)
    );

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Group[];
      setGroups(groupsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking user existence:", error);
      return false;
    }
  };

  const addMember = async () => {
    const email = memberEmail.toLowerCase().trim();
    
    if (!email) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    if (members.includes(email)) {
      Alert.alert("Error", "This member is already added");
      return;
    }

    if (email === user?.email) {
      Alert.alert("Error", "You are automatically added to the group");
      setMemberEmail("");
      return;
    }

    setAddingMember(true);
    
    try {
      const userExists = await checkUserExists(email);
      
      if (!userExists) {
        Alert.alert(
          "Error", 
          "This user is not registered with ExpenseHive. Please invite them to join first."
        );
        setMemberEmail("");
      } else {
        setMembers([...members, email]);
        setMemberEmail("");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to verify user");
    } finally {
      setAddingMember(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    try {
      const allMembers = [...new Set([...members, user.email])];
      const groupData = {
        name: newGroupName.trim(),
        createdBy: user.email,
        members: allMembers,
        createdAt: Timestamp.now(),
      };

      const groupRef = await addDoc(collection(db, "groups"), groupData);
      setModalVisible(false);
      setNewGroupName("");
      setMembers([]);
      setMemberEmail("");

      router.push(`/(group)/${groupRef.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "Failed to create group");
    }
  };

  const removeMember = (email: string) => {
    setMembers(members.filter((m) => m !== email));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

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

      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No groups yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a group to split expenses with friends
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.groupItem}
              onPress={() => router.push(`/(group)/${item.id}`)}
            >
              <View>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupMembers}>
                  {item.members.length} members
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          )}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Group</Text>

            <TextInput
              style={styles.input}
              placeholder="Group Name"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <View style={styles.memberInput}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Add Member Email"
                value={memberEmail}
                onChangeText={setMemberEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!addingMember}
              />
              <TouchableOpacity
                style={[
                  styles.addMemberButton,
                  addingMember && styles.buttonDisabled
                ]}
                onPress={addMember}
                disabled={addingMember}
              >
                {addingMember ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.addMemberButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>

            {members.length > 0 && (
              <View style={styles.membersList}>
                {members.map((email) => (
                  <View key={email} style={styles.memberChip}>
                    <Text style={styles.memberEmail}>{email}</Text>
                    <TouchableOpacity onPress={() => removeMember(email)}>
                      <Ionicons name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewGroupName("");
                  setMembers([]);
                  setMemberEmail("");
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  groupItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  groupMembers: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  memberInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  addMemberButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
  },
  addMemberButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  membersList: {
    marginBottom: 15,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 20,
    marginBottom: 5,
  },
  memberEmail: {
    flex: 1,
    marginRight: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  createButton: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
