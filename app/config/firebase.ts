import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6PCtxglOWdzXH71zpnisXqfu8xLJzhHY",
  authDomain: "expensehive-f431e.firebaseapp.com",
  projectId: "expensehive-f431e",
  storageBucket: "expensehive-f431e.firebasestorage.app",
  messagingSenderId: "524048597486",
  appId: "1:524048597486:web:69771803e7e9187ba6ceff",
  measurementId: "G-6KP64WT0HF",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
