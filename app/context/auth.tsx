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

const AUTH_KEY = "@auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to ensure user document exists
  const ensureUserDocument = async (user: User) => {
    try {
      const userDocRef = doc(collection(db, "users"), user.uid);
      const emailDocRef = doc(
        collection(db, "users"),
        user.email?.toLowerCase() || ""
      );

      const userDoc = await getDoc(userDocRef);
      const emailDoc = await getDoc(emailDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: user.email?.toLowerCase(),
          uid: user.uid,
          createdAt: new Date(),
        });
      }

      if (!emailDoc.exists() && user.email) {
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

  // Load saved auth state when app starts
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Set up Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              await ensureUserDocument(firebaseUser);
              setUser(firebaseUser);
              // Save user data to AsyncStorage
              const userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                // Add any other user data you want to persist
              };
              await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userData));
            } catch (error) {
              console.error("Error saving auth state:", error);
            }
          } else {
            setUser(null);
            // Clear saved auth data
            await AsyncStorage.removeItem(AUTH_KEY);
          }
          setLoading(false);
        });

        // Check for saved auth data
        const savedAuth = await AsyncStorage.getItem(AUTH_KEY);
        if (savedAuth) {
          const userData = JSON.parse(savedAuth);
          // This will trigger the onAuthStateChanged listener above
          await signInWithEmailAndPassword(
            auth,
            userData.email,
            userData.password
          );
        } else {
          setLoading(false);
        }

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
      // Save credentials for auto-login
      const userData = {
        email,
        password, // Note: In a production app, consider encryption
        uid: userCredential.user.uid,
      };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userData));
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
      await ensureUserDocument(userCredential.user);
      // Save credentials for auto-login
      const userData = {
        email,
        password, // Note: In a production app, consider encryption
        uid: userCredential.user.uid,
      };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userData));
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
      setUser(null);
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
