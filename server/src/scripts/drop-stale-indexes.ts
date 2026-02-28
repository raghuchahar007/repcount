import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

async function dropStaleIndexes() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db!
  const usersCollection = db.collection('users')

  const indexes = await usersCollection.indexes()
  console.log('Current indexes:', indexes.map(i => i.name))

  // Drop email_1 if exists (stale non-sparse index)
  try {
    await usersCollection.dropIndex('email_1')
    console.log('Dropped stale email_1 index')
  } catch (e: any) {
    if (e.codeName === 'IndexNotFound') {
      console.log('email_1 index not found (already dropped)')
    } else {
      throw e
    }
  }

  // Drop phone_1 if exists (will be recreated as sparse)
  try {
    await usersCollection.dropIndex('phone_1')
    console.log('Dropped phone_1 index (will be recreated as sparse)')
  } catch (e: any) {
    if (e.codeName === 'IndexNotFound') {
      console.log('phone_1 index not found')
    } else {
      throw e
    }
  }

  // Sync indexes with new schema
  await mongoose.connection.syncIndexes()
  console.log('Indexes synced')

  const newIndexes = await usersCollection.indexes()
  console.log('New indexes:', newIndexes.map(i => `${i.name} ${JSON.stringify(i.key)}`))

  process.exit(0)
}

dropStaleIndexes().catch(e => { console.error(e); process.exit(1) })
