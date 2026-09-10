import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "optimistic-way-6lsxp",
  appId: "1:215816704573:web:7d1d9c5e30446800c39054",
  apiKey: "AIzaSyBkOqkvbwpSv0ixPFyaCYnZXQFZRz67l44",
  authDomain: "optimistic-way-6lsxp.firebaseapp.com",
  databaseURL: "(default)",
  storageBucket: "optimistic-way-6lsxp.firebasestorage.app",
  messagingSenderId: "215816704573"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-invexa-3119445d-beea-420c-bbd0-94a561ccae74");

async function run() {
  try {
    const snap = await getDocs(collection(db, "companies"));
    console.log("Firebase works in Node! Docs:", snap.size);
  } catch (err) {
    console.error("Firebase error in Node:", err);
  }
}
run();
