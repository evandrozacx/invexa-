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
}

async function saveInventory(inv: any) {
  try {
    if (!inv.id) inv.id = "inv_" + Date.now();
    await setDoc(doc(db, "inventories", inv.id), inv);
  } catch (err) {
    console.error("Firebase saveInventory error:", err);
  }
}`;

const importInsertIdx = content.indexOf('const app = express();');
content = content.slice(0, importInsertIdx) + imports + '\n' + content.slice(importInsertIdx);

const startGet = content.indexOf('async function getInventory');
const endGet = content.indexOf('function compareCollections');

content = content.slice(0, startGet) + getInventoryReplace + '\n\n' + content.slice(endGet);

fs.writeFileSync(file, content);
