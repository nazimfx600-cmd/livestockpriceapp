import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD90GhBHFEJVKVfz-iXUrn59DZZL9PjZxU",
  authDomain: "alert-tributary-vxhgq.firebaseapp.com",
  projectId: "alert-tributary-vxhgq",
  storageBucket: "alert-tributary-vxhgq.firebasestorage.app",
  messagingSenderId: "248552886991",
  appId: "1:248552886991:web:6445ea407ec32ffc465dba"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with custom database ID
export const db = initializeFirestore(app, {}, "ai-studio-livestockpriceap-fff95fbf-4aeb-4b19-b923-0312b7420cd8");
