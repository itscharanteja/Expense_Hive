import { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, collection, getDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = "@auth_key";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to ensure user document exists
  const ensureUserDocument = async (user: User) => {
    try {
      // Check if user document exists
      const userDocRef = doc(collection(db, "users"), user.uid);
      const emailDocRef = doc(
        collection(db, "users"),
        user.email?.toLowerCase() || ""
      );

      const userDoc = await getDoc(userDocRef);
      const emailDoc = await getDoc(emailDocRef);

      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(userDocRef, {
          email: user.email?.toLowerCase(),
          uid: user.uid,
          createdAt: new Date(),
        });
      }

      if (!emailDoc.exists() && user.email) {
        // Create email document if it doesn't exist
        await setDoc(emailDocRef, {
          email: user.email.toLowerCase(),
          uid: user.uid,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Error ensuring user document:", error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // Ensure user document exists whenever user logs in
            await ensureUserDocument(user);
            setUser(user);
            try {
              const userData = {
                uid: user.uid,
                email: user.email,
              };
              await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userData));
            } catch (error) {
              console.error("Error saving auth state:", error);
            }
          } else {
            setUser(null);
            await AsyncStorage.removeItem(AUTH_KEY);
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
      // Ensure user document exists on sign in
      await ensureUserDocument(userCredential.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user documents
      await ensureUserDocument(userCredential.user);
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
      await AsyncStorage.removeItem(AUTH_KEY);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
