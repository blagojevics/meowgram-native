/**
 * Script to convert all existing usernames to lowercase in Firestore
 * Run this once to fix existing data
 */

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json"); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixUsernames() {
  console.log("Starting username conversion...");

  try {
    const usersSnapshot = await db.collection("users").get();

    console.log(`Found ${usersSnapshot.size} users to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const currentUsername = data.username;

      if (!currentUsername) {
        console.log(`  Skipping user ${doc.id} - no username`);
        skippedCount++;
        continue;
      }

      const lowercaseUsername = currentUsername.toLowerCase();

      if (currentUsername !== lowercaseUsername) {
        console.log(
          ` Converting: "${currentUsername}" → "${lowercaseUsername}"`
        );
        batch.update(doc.ref, { username: lowercaseUsername });
        updatedCount++;
        batchCount++;

        // Commit batch when it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`✅ Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
      } else {
        skippedCount++;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} updates`);
    }

    console.log("\n=== Summary ===");
    console.log(`✅ Updated: ${updatedCount} usernames`);
    console.log(
      `⏭️  Skipped: ${skippedCount} (already lowercase or no username)`
    );
    console.log("✨ Done!");
  } catch (error) {
    console.error("❌ Error fixing usernames:", error);
    process.exit(1);
  }

  process.exit(0);
}

fixUsernames();
