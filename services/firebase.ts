import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAz8PEHc32sYB9RlrzlQYRWIGOoxY6mrKU",
  authDomain: "dentista-7cf2c.firebaseapp.com",
  projectId: "dentista-7cf2c",
  storageBucket: "dentista-7cf2c.firebasestorage.app",
  messagingSenderId: "329794275114",
  appId: "1:329794275114:web:612f11b3f5a1ed20764053",
  measurementId: "G-CN4MRF9KKB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Force account selection prompt when logging in
// This helps when a user wants to switch accounts after logging out
googleProvider.setCustomParameters({
  prompt: 'select_account'
});