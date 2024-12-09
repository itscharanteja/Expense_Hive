import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../context/auth";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useEffect, useState } from "react";
import { Colors } from "../constants/Colors";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";

type UserProfile = {
  email: string;
  username: string;
  createdAt: Date;
};

type SpendingSummary = {
  personalTotal: number;
  groupTotal: number;
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [spendingSummary, setSpendingSummary] = useState<SpendingSummary>({
    personalTotal: 0,
    groupTotal: 0,
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile({
            email: userData.email,
            username: userData.username,
            createdAt: userData.createdAt.toDate(),
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    const fetchData = async () => {
      if (!user) return;
      await fetchUserProfile();
      setLoading(false);
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;

    // Set up listeners for real-time updates without date filtering
    const personalExpensesQuery = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid)
    );

    const groupExpensesQuery = query(
      collection(db, "groupExpenses"),
      where("splitBetween", "array-contains", user.email)
    );

    // Listen to personal expenses
    const unsubscribePersonal = onSnapshot(personalExpensesQuery, (snapshot) => {
      const personalTotal = snapshot.docs.reduce(
        (sum, doc) => sum + doc.data().amount,
        0
      );
      setSpendingSummary(prev => ({
        ...prev,
        personalTotal
      }));
    });

    // Listen to group expenses
    const unsubscribeGroup = onSnapshot(groupExpensesQuery, (snapshot) => {
      const groupTotal = snapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.amount / data.splitBetween.length);
      }, 0);
      setSpendingSummary(prev => ({
        ...prev,
        groupTotal
      }));
    });

    return () => {
      unsubscribePersonal();
      unsubscribeGroup();
    };
  }, [user]);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/login");
          } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  const handleResetPassword = async () => {
    const userEmail = user?.email;
    if (!userEmail) return;

    Alert.alert(
      "Reset Password",
      "Are you sure you want to reset your password? An email will be sent to your registered email address.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, userEmail);
              Alert.alert(
                "Success",
                "Password reset email sent. Please check your inbox."
              );
            } catch (error: any) {
              console.error("Error sending reset email:", error);
              Alert.alert("Error", "Failed to send reset email. Please try again.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userProfile?.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.spendingCard}>
          <Text style={styles.spendingTitle}>All Time Spending</Text>
          <View style={styles.spendingRow}>
            <View style={styles.spendingItem}>
              <Text style={styles.spendingLabel}>Personal</Text>
              <Text style={styles.spendingAmount}>
                {spendingSummary.personalTotal.toFixed(2)} kr
              </Text>
            </View>
            <View style={styles.spendingItem}>
              <Text style={styles.spendingLabel}>Group Share</Text>
              <Text style={styles.spendingAmount}>
                {spendingSummary.groupTotal.toFixed(2)} kr
              </Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {(spendingSummary.personalTotal + spendingSummary.groupTotal).toFixed(2)} kr
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>@{userProfile?.username}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userProfile?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {userProfile?.createdAt.toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.resetPasswordButton} 
          onPress={handleResetPassword}
        >
          <Ionicons name="key-outline" size={20} color={Colors.primary} />
          <Text style={styles.resetPasswordText}>Reset Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  profileCard: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    color: "white",
    fontWeight: "bold",
  },
  infoSection: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 40,
    marginHorizontal: 20,
    gap: 12,
  },
  resetPasswordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    gap: 8,
  },
  resetPasswordText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#FFF0F0",
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
  spendingCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spendingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: Colors.text,
  },
  spendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  spendingItem: {
    flex: 1,
    alignItems: "center",
  },
  spendingLabel: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 2,
  },
  spendingAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
});
