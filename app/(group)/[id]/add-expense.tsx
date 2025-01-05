import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  addDoc,
  Timestamp,
  getDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/auth";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";

type Member = {
  email: string;
  username: string;
  selected: boolean;
};

export default function AddGroupExpense() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localReceiptUri, setLocalReceiptUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!id) return;
      try {
        const groupDoc = await getDoc(doc(db, "groups", id as string));
        if (groupDoc.exists()) {
          const memberEmails = groupDoc.data().members;

          const membersWithUsernames: Member[] = [];
          for (const email of memberEmails) {
            const userQuery = query(
              collection(db, "users"),
              where("email", "==", email)
            );
            const userSnapshot = await getDocs(userQuery);
            if (!userSnapshot.empty) {
              membersWithUsernames.push({
                email: email,
                username: userSnapshot.docs[0].data().username,
                selected: true,
              });
            }
          }
          setMembers(membersWithUsernames);
        }
      } catch (error) {
        console.error("Error fetching group members:", error);
        Alert.alert("Error", "Failed to load group members");
      }
    };

    fetchGroupMembers();
  }, [id]);

  const toggleMemberSelection = (email: string) => {
    setMembers(
      members.map((member) =>
        member.email === email
          ? { ...member, selected: !member.selected }
          : member
      )
    );
  };

  const getSelectedMembers = () =>
    members.filter((member) => member.selected).map((member) => member.email);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images" as ImagePicker.MediaType,
        quality: 0.5,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0].uri) {
        setLocalReceiptUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Gallery permission is required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as ImagePicker.MediaType,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 2],
      });

      if (!result.canceled && result.assets[0].uri) {
        setLocalReceiptUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadReceipt = async (uri: string) => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      const response = await fetch(manipulatedImage.uri);
      const blob = await response.blob();

      if (blob.size > 1024 * 1024) {
        throw new Error("Image size must be less than 1MB");
      }
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64data = reader.result as string;
            const receiptData = {
              imageData: base64data,
              uploadedBy: user?.email,
              uploadedAt: Timestamp.now(),
              groupId: id,
            };

            const receiptRef = await addDoc(
              collection(db, "receipts"),
              receiptData
            );
            resolve(receiptRef.id);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!user || !id) return;

    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    const selectedMembers = getSelectedMembers();
    if (selectedMembers.length === 0) {
      Alert.alert("Error", "Please select at least one member to split with");
      return;
    }

    try {
      setIsSubmitting(true);
      let receiptId = null;

      if (localReceiptUri) {
        setUploadingImage(true);
        try {
          receiptId = await uploadReceipt(localReceiptUri);
        } catch (error) {
          console.error("Error uploading receipt:", error);
          Alert.alert(
            "Error",
            "Failed to upload receipt. Continue without receipt?"
          );
        }
        setUploadingImage(false);
      }

      const expenseData = {
        amount: Number(amount),
        description: description.trim(),
        date: Timestamp.now(),
        paidBy: user.email,
        groupId: id,
        receiptId,
        splitBetween: selectedMembers,
        settled: false,
      };

      await addDoc(collection(db, "groupExpenses"), expenseData);
      Alert.alert("Success", "Expense added successfully");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add expense");
      console.error("Error adding expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    Alert.alert(
      "Discard Changes",
      "Are you sure you want to go back? Any unsaved changes will be lost.",
      [
        {
          text: "Stay",
          style: "cancel",
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Group Expense</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          style={styles.input}
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Split Between</Text>
          {members.map((member) => (
            <TouchableOpacity
              key={member.email}
              style={[
                styles.memberItem,
                member.selected && styles.memberItemSelected,
              ]}
              onPress={() => toggleMemberSelection(member.email)}
            >
              <Text
                style={[
                  styles.memberUsername,
                  member.selected && styles.memberUsernameSelected,
                ]}
              >
                @{member.username}
              </Text>
              <Ionicons
                name={member.selected ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={member.selected ? "#007AFF" : "#666"}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.receiptSection}>
          <Text style={styles.receiptTitle}>Attach Receipt</Text>
          <View style={styles.receiptButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cameraButtonStyle]}
              onPress={takePhoto}
              disabled={uploadingImage}
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.actionButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.galleryButtonStyle]}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              <Ionicons name="images" size={24} color="white" />
              <Text style={styles.actionButtonText}>Choose Photo</Text>
            </TouchableOpacity>
          </View>

          {uploadingImage && (
            <Text style={styles.uploadingText}>Uploading receipt...</Text>
          )}

          {localReceiptUri && (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: localReceiptUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.removeButtonContainer}
                onPress={() => setLocalReceiptUri(null)}
              >
                <Text style={styles.removeButtonText}>Remove Receipt</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Adding..." : "Add Expense"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
    zIndex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 120,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginBottom: 8,
  },
  memberItemSelected: {
    backgroundColor: "#E3F2FD",
  },
  memberUsername: {
    fontSize: 16,
    color: "#333",
  },
  memberUsernameSelected: {
    color: "#007AFF",
    fontWeight: "500",
  },
  section: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  cameraButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    gap: 10,
  },
  cameraButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  receiptContainer: {
    marginBottom: 15,
    alignItems: "center",
  },
  receiptImage: {
    width: "100%",
    height: 200,
    borderRadius: 5,
    marginBottom: 10,
  },
  removeReceiptButton: {
    padding: 10,
  },
  removeReceiptText: {
    color: "#FF3B30",
    fontWeight: "bold",
  },
  receiptSection: {
    marginBottom: 20,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  receiptButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  cameraButtonStyle: {
    backgroundColor: "#34C759",
  },
  galleryButtonStyle: {
    backgroundColor: "#007AFF",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
  },
  uploadingText: {
    textAlign: "center",
    color: "#666",
    marginTop: 10,
  },
  previewContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  removeButtonContainer: {
    padding: 8,
  },
  removeButtonText: {
    color: "#FF3B30",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
