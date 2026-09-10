import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, updateDoc, deleteField } from "firebase/firestore";

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
  const snap = await getDocs(collection(db, "inventories"));
  for (const d of snap.docs) {
    const inv = d.data();
    let migrated = false;
    
    if (inv.products && inv.products.length > 0) {
      console.log("Migrating products for", inv.id);
      const CHUNK_SIZE = 2500;
      for (let i = 0; i < inv.products.length; i += CHUNK_SIZE) {
        const chunk = inv.products.slice(i, i + CHUNK_SIZE);
        await setDoc(doc(db, "inventories/" + inv.id + "/productChunks", "chunk_" + i), { items: chunk });
      }
      migrated = true;
    }
    
    if (inv.addresses && inv.addresses.length > 0) {
      console.log("Migrating addresses for", inv.id);
      const CHUNK_SIZE = 2500;
      for (let i = 0; i < inv.addresses.length; i += CHUNK_SIZE) {
        const chunk = inv.addresses.slice(i, i + CHUNK_SIZE);
        await setDoc(doc(db, "inventories/" + inv.id + "/addressChunks", "chunk_" + i), { items: chunk });
      }
      migrated = true;
    }
    
    if (migrated) {
      await updateDoc(d.ref, {
        products: deleteField(),
        addresses: deleteField()
      });
      console.log("Finished", inv.id);
    }
  }
  console.log("Done");
}
run();
