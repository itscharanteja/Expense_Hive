import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBi9R4Krp-QQrJR3GGiSWl_OoibjsxPZHs",
  authDomain: "expensehive2.firebaseapp.com",
  projectId: "expensehive2",
  storageBucket: "expensehive2.firebasestorage.app",
  messagingSenderId: "198416127927",
  appId: "1:198416127927:web:5e5da475fcc2d291bd7a32",
  measurementId: "G-8BX9BSXYRG",
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

const firebase = { app, auth, db };
export default firebase;

export { app, auth, db };
