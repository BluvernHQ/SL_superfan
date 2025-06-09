// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCN6RqLYg2GEpLhgJ2y_pYgU-qFT-TKvLk",
  authDomain: "superfan-a7e04.firebaseapp.com",
  projectId: "superfan-a7e04",
  storageBucket: "superfan-a7e04.firebasestorage.app",
  messagingSenderId: "252277224014",
  appId: "1:252277224014:web:8fad4e7cff1cd47b61c91f",
  measurementId: "G-Z3KXDMWFZB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export default app
