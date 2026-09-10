import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, collection, getDocs, setDoc, doc, deleteDoc, getDoc, onSnapshot, query, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  projectId: "optimistic-way-6lsxp",
  appId: "1:215816704573:web:7d1d9c5e30446800c39054",
  apiKey: "AIzaSyBkOqkvbwpSv0ixPFyaCYnZXQFZRz67l44",
  authDomain: "optimistic-way-6lsxp.firebaseapp.com",
  databaseURL: "(default)",
  storageBucket: "optimistic-way-6lsxp.firebasestorage.app",
  messagingSenderId: "215816704573"
};

// Ensure Firebase is only initialized once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the specific database ID provisioned
const db = getFirestore(app, "ai-studio-invexa-3119445d-beea-420c-bbd0-94a561ccae74");

// Enable offline persistence
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
    } else if (err.code === "unimplemented") {
      console.warn("The current browser does not support all of the features required to enable persistence");
    }
  });
}

export { app, db, collection, getDocs, setDoc, doc, deleteDoc, getDoc, onSnapshot, query, writeBatch };
