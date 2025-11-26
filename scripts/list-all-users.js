/**
 * Script to list all users in Firestore
 * Run with: node scripts/list-all-users.js YOUR_EMAIL YOUR_PASSWORD
 */

require("dotenv").config();
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function listAllUsers() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error(
      "❌ Usage: node scripts/list-all-users.js YOUR_EMAIL YOUR_PASSWORD"
    );
    process.exit(1);
  }

  try {
    console.log("🔐 Signing in...");
    await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Signed in successfully\n");

    const usersSnapshot = await getDocs(collection(db, "users"));

    console.log(`\n📊 Total users: ${usersSnapshot.size}\n`);
    console.log("USERNAME                 | UID");
    console.log("─".repeat(70));

    const users = usersSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        username: doc.data().username,
        uid: doc.data().uid,
      }))
      .sort((a, b) => (a.username || "").localeCompare(b.username || ""));

    users.forEach((user) => {
      const username = (user.username || "(no username)").padEnd(24);
      console.log(`${username} | ${user.uid}`);
    });

    console.log("\n✨ Done!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

listAllUsers();
