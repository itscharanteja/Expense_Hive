import { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebase";

type UserData = {
  uid: string;
  email: string;
  username: string;
};

type AuthContextType = {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = "@auth_user";
const CREDS_KEY = "@auth_creds";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // Fetch user data including username
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              setUserData(userData);
            }
            setUser(user);
          } else {
            setUser(null);
            setUserData(null);
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error initializing auth:", error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      await ensureUserDocument(userCredential.user);
      // Save credentials securely
      await AsyncStorage.setItem(
        CREDS_KEY,
        JSON.stringify({ email, password })
      );
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);

      // Check if username is already taken
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", username.toLowerCase())
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        throw new Error("Username is already taken");
      }

      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user document with username
      const userData = {
        uid: userCredential.user.uid,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        createdAt: new Date(),
      };

      await setDoc(doc(db, "users", userCredential.user.uid), userData);
      setUserData(userData);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      // Clear all saved data
      await AsyncStorage.removeItem(AUTH_KEY);
      await AsyncStorage.removeItem(CREDS_KEY);
      setUser(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, userData, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
} 

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Add a default export
const AuthModule = {
  AuthProvider,
  useAuth,
};

export default AuthModule;
