const fs = require('fs');

const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const imports = `import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "optimistic-way-6lsxp",
  appId: "1:215816704573:web:7d1d9c5e30446800c39054",
  apiKey: "AIzaSyBkOqkvbwpSv0ixPFyaCYnZXQFZRz67l44",
  authDomain: "optimistic-way-6lsxp.firebaseapp.com",
  databaseURL: "(default)",
  storageBucket: "optimistic-way-6lsxp.firebasestorage.app",
  messagingSenderId: "215816704573"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, "ai-studio-invexa-3119445d-beea-420c-bbd0-94a561ccae74");
`;

const getInventoryReplace = `async function getInventory(id: string) {
  try {
    const snap = await getDoc(doc(db, "inventories", id));
    if (snap.exists()) return snap.data();
    return null;
  } catch (err) {
    console.error("Firebase getInventory error:", err);
    return null;
  }
}`;

const saveInventoryReplace = `async function saveInventory(inv: any) {
  try {
    if (!inv.id) inv.id = "inv_" + Date.now();
    await setDoc(doc(db, "inventories", inv.id), inv);
  } catch (err) {
    console.error("Firebase saveInventory error:", err);
  }
}`;

// Find imports insertion
const importInsertIdx = content.indexOf('const app = express();');
content = content.slice(0, importInsertIdx) + imports + '\n' + content.slice(importInsertIdx);

// Replace getInventory
const startGet = content.indexOf('async function getInventory(id: string) {');
const endGet = content.indexOf('async function saveInventory(inv: any) {');
if (startGet !== -1 && endGet !== -1) {
  content = content.slice(0, startGet) + getInventoryReplace + '\n\n' + content.slice(endGet);
}

// Replace saveInventory
const startSave = content.indexOf('async function saveInventory(inv: any) {');
const endSave = content.indexOf('function compareCollections(');
if (startSave !== -1 && endSave !== -1) {
  content = content.slice(0, startSave) + saveInventoryReplace + '\n\n' + content.slice(endSave);
}

// Remove the db.json logic from getLocalDb to make it cleaner, but wait, other routes might use it!
// E.g., /api/db, /api/companies. Let's rewrite /api/db and all basic CRUD methods or getLocalDb itself!
