/**
 * Script to convert all existing usernames to lowercase in Firestore
 * Uses Firebase client SDK (no service account needed)
 * Run with: node scripts/fix-usernames-client.js YOUR_EMAIL YOUR_PASSWORD
 */

require("dotenv").config();
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log("Firebase Project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function fixUsernames() {
  console.log("Starting username conversion...\n");

  // You need to sign in with an admin account
  console.log("Please provide admin credentials:");
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error(
      "❌ Usage: node scripts/fix-usernames-client.js YOUR_EMAIL YOUR_PASSWORD"
    );
    process.exit(1);
  }

  try {
    console.log("🔐 Signing in...");
    await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Signed in successfully\n");

    const usersSnapshot = await getDocs(collection(db, "users"));

    console.log(`Found ${usersSnapshot.size} users to process\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data();
      const currentUsername = data.username;

      if (!currentUsername) {
        console.log(`⚠️  Skipping user ${userDoc.id} - no username`);
        skippedCount++;
        continue;
      }

      const lowercaseUsername = currentUsername.toLowerCase();

      if (currentUsername !== lowercaseUsername) {
        try {
          console.log(
            `📝 Converting: "${currentUsername}" → "${lowercaseUsername}"`
          );
          await updateDoc(doc(db, "users", userDoc.id), {
            username: lowercaseUsername,
          });
          updatedCount++;
        } catch (error) {
          console.error(`❌ Error updating user ${userDoc.id}:`, error.message);
          errorCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log("\n=== Summary ===");
    console.log(`✅ Updated: ${updatedCount} usernames`);
    console.log(
      `⏭️  Skipped: ${skippedCount} (already lowercase or no username)`
    );
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    console.log("✨ Done!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

fixUsernames();
