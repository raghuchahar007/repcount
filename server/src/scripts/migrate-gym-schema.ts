// server/src/scripts/migrate-gym-schema.ts
// Run BEFORE deploying new code: npx ts-node src/scripts/migrate-gym-schema.ts
// ⚠️  Must be run on VPS against live MongoDB BEFORE new code is deployed.

import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!)
  const db = mongoose.connection.db!

  const gyms = await db.collection('gyms').find({}).toArray()
  console.log(`Found ${gyms.length} gym(s) to migrate`)

  for (const gym of gyms) {
    const updates: Record<string, any> = {}

    // 1. Migrate opening_time/closing_time → timing_slots
    if (gym.opening_time || gym.closing_time) {
      updates.timing_mode = 'slots'
      updates.timing_slots = [{
        label: 'Open Hours',
        open: gym.opening_time || '06:00',
        close: gym.closing_time || '22:00',
      }]
      updates.$unset = { opening_time: '', closing_time: '' }
      console.log(`  ${gym.name}: migrating timing ${gym.opening_time}–${gym.closing_time} → slot`)
    } else {
      updates.timing_mode = 'slots'
      updates.timing_slots = [
        { label: 'Morning', open: '06:00', close: '12:00' },
        { label: 'Evening', open: '16:00', close: '22:00' },
      ]
      console.log(`  ${gym.name}: no timing set, using defaults`)
    }

    // 2. Migrate flat pricing → nested pricing per plan type
    // Before: { monthly: 1200, quarterly: 3000, half_yearly: 5500, yearly: 10000 }
    // After:  { strength: { monthly: 1200, ... }, strength_cardio: { monthly: 1200, ... } }
    const flat = gym.pricing || {}
    const isFlat = typeof flat.monthly === 'number' || typeof flat.quarterly === 'number'

    if (isFlat) {
      updates.pricing = {
        strength: {
          monthly: flat.monthly || 0,
          quarterly: flat.quarterly || 0,
          half_yearly: flat.half_yearly || 0,
          yearly: flat.yearly || 0,
        },
        strength_cardio: {
          monthly: flat.monthly || 0,
          quarterly: flat.quarterly || 0,
          half_yearly: flat.half_yearly || 0,
          yearly: flat.yearly || 0,
        },
      }
      console.log(`  ${gym.name}: migrating flat pricing to nested`)
    }

    // 3. Set default plan_types if missing
    if (!gym.plan_types || gym.plan_types.length === 0) {
      updates.plan_types = [
        { id: 'strength', name: 'Strength' },
        { id: 'strength_cardio', name: 'Strength + Cardio' },
      ]
    }

    if (Object.keys(updates).length > 0) {
      const { $unset, ...set } = updates
      const op: any = { $set: set }
      if ($unset) op.$unset = $unset
      await db.collection('gyms').updateOne({ _id: gym._id }, op)
      console.log(`  ${gym.name}: ✓ migrated`)
    }
  }

  console.log('\nMigration complete.')
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
