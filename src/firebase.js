import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC-36dXcrpjUwxCRbaCrzhQKg18nJNdYWg",
  authDomain: "omnia-haccp-pro.firebaseapp.com",
  projectId: "omnia-haccp-pro",
  storageBucket: "omnia-haccp-pro.firebasestorage.app",
  messagingSenderId: "684487538834",
  appId: "1:684487538834:web:09f618d994d12b35f2ce4b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

signInAnonymously(auth).catch((error) => {
  console.error("Accesso anonimo Firebase non riuscito:", error);
});

export default app;
