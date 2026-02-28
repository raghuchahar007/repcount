import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

import { User } from '../models/User'
import { Gym } from '../models/Gym'
import { Member } from '../models/Member'
import { Membership } from '../models/Membership'
import { Attendance } from '../models/Attendance'
import { GymPost } from '../models/GymPost'
import { Lead } from '../models/Lead'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(8, 0, 0, 0)
  return d
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to MongoDB')

  // --- Users ---
  const users = [
    { phone: '+919999999999', role: 'owner', full_name: 'Raj Fitness' },
    { phone: '+919999999901', role: 'owner', full_name: 'Priya Wellness' },
    { phone: '+919999999902', role: 'owner', full_name: 'Amit Power' },
    { phone: '+919999999903', role: 'member', full_name: 'Rahul Sharma' },
    { phone: '+919999999904', role: 'member', full_name: 'Sneha Patel' },
    { phone: '+919999999905', role: 'member', full_name: 'Vikram Singh' },
    { phone: '+919999999906', role: 'member', full_name: 'Anita Kumari' },
    { phone: '+919999999907', role: 'member', full_name: 'Deepak Yadav' },
  ]

  const userDocs: Record<string, any> = {}
  for (const u of users) {
    const doc = await User.findOneAndUpdate(
      { phone: u.phone },
      { $set: { role: u.role, full_name: u.full_name } },
      { upsert: true, new: true }
    )
    userDocs[u.phone] = doc
    console.log(`  User: ${u.full_name} (${u.phone}) → ${doc._id}`)
  }

  // --- Gyms ---
  const gymConfigs = [
    {
      slug: 'iron-paradise',
      name: 'Iron Paradise',
      city: 'Jaipur',
      ownerPhone: '+919999999999',
      pricing: { monthly: 1000, quarterly: 2500, half_yearly: 4500, yearly: 8000 },
      facilities: ['Treadmill', 'Weights', 'Crossfit', 'AC'],
      description: 'Premium gym in the heart of Jaipur',
    },
    {
      slug: 'fitzone-agra',
      name: 'FitZone Agra',
      city: 'Agra',
      ownerPhone: '+919999999901',
      pricing: { monthly: 800, quarterly: 2000, half_yearly: 3500, yearly: 6000 },
      facilities: ['Treadmill', 'Weights', 'Zumba'],
      description: 'Affordable fitness for everyone in Agra',
    },
    {
      slug: 'powerhouse-gym',
      name: 'PowerHouse Gym',
      city: 'Delhi',
      ownerPhone: '+919999999902',
      pricing: { monthly: 1500, quarterly: 4000, half_yearly: 7000, yearly: 12000 },
      facilities: ['Treadmill', 'Weights', 'Swimming', 'Sauna', 'AC'],
      description: 'Delhi\'s premium powerlifting gym',
    },
  ]

  const gymDocs: Record<string, any> = {}
  for (const g of gymConfigs) {
    const doc = await Gym.findOneAndUpdate(
      { slug: g.slug },
      {
        $set: {
          name: g.name,
          city: g.city,
          owner: userDocs[g.ownerPhone]._id,
          pricing: g.pricing,
          facilities: g.facilities,
          description: g.description,
        },
      },
      { upsert: true, new: true }
    )
    gymDocs[g.slug] = doc
    console.log(`  Gym: ${g.name} (${g.slug}) → ${doc._id}`)
  }

  // --- Members ---
  const memberConfigs = [
    // Iron Paradise members
    { phone: '9999999903', name: 'Rahul Sharma', gym: 'iron-paradise', userPhone: '+919999999903', goal: 'muscle_gain', diet_pref: 'nonveg' },
    { phone: '9999999904', name: 'Sneha Patel', gym: 'iron-paradise', userPhone: '+919999999904', goal: 'weight_loss', diet_pref: 'veg' },
    { phone: '9999999907', name: 'Deepak Yadav', gym: 'iron-paradise', userPhone: '+919999999907', goal: 'general', diet_pref: 'egg' },
    // FitZone members
    { phone: '9999999904', name: 'Sneha Patel', gym: 'fitzone-agra', userPhone: '+919999999904', goal: 'weight_loss', diet_pref: 'veg' },
    { phone: '9999999905', name: 'Vikram Singh', gym: 'fitzone-agra', userPhone: '+919999999905', goal: 'muscle_gain', diet_pref: 'nonveg' },
    // PowerHouse members
    { phone: '9999999906', name: 'Anita Kumari', gym: 'powerhouse-gym', userPhone: '+919999999906', goal: 'weight_loss', diet_pref: 'veg' },
  ]

  const memberDocs: Record<string, any> = {}
  for (const m of memberConfigs) {
    const gymId = gymDocs[m.gym]._id
    const userId = userDocs[m.userPhone]._id
    const key = `${m.phone}@${m.gym}`

    const doc = await Member.findOneAndUpdate(
      { gym: gymId, phone: m.phone },
      {
        $set: {
          user: userId,
          name: m.name,
          goal: m.goal,
          diet_pref: m.diet_pref,
          budget: 'medium',
          is_active: true,
        },
      },
      { upsert: true, new: true }
    )
    memberDocs[key] = doc
    console.log(`  Member: ${m.name} @ ${m.gym} → ${doc._id}`)
  }

  // --- Memberships (active) ---
  const now = new Date()
  const membershipConfigs = [
    { memberKey: '9999999903@iron-paradise', plan: 'monthly', amount: 1000, gym: 'iron-paradise' },
    { memberKey: '9999999904@iron-paradise', plan: 'quarterly', amount: 2500, gym: 'iron-paradise' },
    { memberKey: '9999999907@iron-paradise', plan: 'monthly', amount: 1000, gym: 'iron-paradise' },
    { memberKey: '9999999904@fitzone-agra', plan: 'monthly', amount: 800, gym: 'fitzone-agra' },
    { memberKey: '9999999905@fitzone-agra', plan: 'quarterly', amount: 2000, gym: 'fitzone-agra' },
    { memberKey: '9999999906@powerhouse-gym', plan: 'monthly', amount: 1500, gym: 'powerhouse-gym' },
  ]

  for (const ms of membershipConfigs) {
    const member = memberDocs[ms.memberKey]
    const gym = gymDocs[ms.gym]
    const startDate = daysAgo(15)
    const months = ms.plan === 'monthly' ? 1 : ms.plan === 'quarterly' ? 3 : ms.plan === 'half_yearly' ? 6 : 12
    const expiryDate = addMonths(startDate, months)

    await Membership.findOneAndUpdate(
      { member: member._id, gym: gym._id, start_date: { $gte: daysAgo(30) } },
      {
        $set: {
          plan_type: ms.plan,
          amount: ms.amount,
          start_date: startDate,
          expiry_date: expiryDate,
          payment_method: 'upi',
          status: 'active',
        },
      },
      { upsert: true, new: true }
    )
    console.log(`  Membership: ${ms.memberKey} → ${ms.plan}`)
  }

  // --- Attendance (last 30 days) ---
  // Generate attendance for members: some days on, some off to create realistic patterns
  const attendancePatterns: Record<string, number[]> = {
    '9999999903@iron-paradise': [1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 15, 16, 18, 19, 20], // 15 days - top performer
    '9999999904@iron-paradise': [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], // 10 days
    '9999999907@iron-paradise': [1, 3, 5, 7, 9, 11, 13], // 7 days
    '9999999904@fitzone-agra': [3, 6, 9, 12, 15], // 5 days
    '9999999905@fitzone-agra': [1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 14, 15], // 12 days
    '9999999906@powerhouse-gym': [2, 4, 6, 8, 10, 12, 14, 16, 18], // 9 days
  }

  for (const [memberKey, daysBack] of Object.entries(attendancePatterns)) {
    const member = memberDocs[memberKey]
    const gymSlug = memberKey.split('@')[1]
    const gym = gymDocs[gymSlug]

    for (const d of daysBack) {
      const checkInDate = daysAgo(d)
      checkInDate.setHours(0, 0, 0, 0)

      await Attendance.findOneAndUpdate(
        { member: member._id, gym: gym._id, check_in_date: checkInDate },
        { $set: { checked_in_at: daysAgo(d) } },
        { upsert: true }
      )
    }
    console.log(`  Attendance: ${memberKey} → ${daysBack.length} check-ins`)
  }

  // --- Posts ---
  interface PostDef { title: string; body: string; post_type: string; starts_at?: Date; ends_at?: Date }
  const postConfigs: { gym: string; owner: string; posts: PostDef[] }[] = [
    {
      gym: 'iron-paradise',
      owner: '+919999999999',
      posts: [
        { title: '30-Day Push-Up Challenge', body: 'Start with 10 push-ups on day 1, add 5 every day. Who can finish all 30 days?', post_type: 'challenge', starts_at: daysAgo(5), ends_at: addMonths(new Date(), 1) },
        { title: 'New Cardio Zone Open!', body: 'We\'ve added 5 new treadmills and 3 ellipticals. Come check them out!', post_type: 'announcement' },
      ],
    },
    {
      gym: 'fitzone-agra',
      owner: '+919999999901',
      posts: [
        { title: 'Weight Loss Challenge - Feb', body: 'Lose the most % body weight this month. Winner gets 1 month free!', post_type: 'challenge', starts_at: daysAgo(10), ends_at: addMonths(new Date(), 1) },
        { title: 'Diwali Offer - 20% Off', body: 'Get 20% off on all quarterly and yearly plans. Limited time!', post_type: 'offer' },
      ],
    },
    {
      gym: 'powerhouse-gym',
      owner: '+919999999902',
      posts: [
        { title: 'Powerlifting Meet - March', body: 'Annual powerlifting competition. Register at the front desk.', post_type: 'event', starts_at: addMonths(new Date(), 1) },
      ],
    },
  ]

  for (const pc of postConfigs) {
    const gym = gymDocs[pc.gym]
    const author = userDocs[pc.owner]

    for (const p of pc.posts) {
      await GymPost.findOneAndUpdate(
        { gym: gym._id, title: p.title },
        {
          $set: {
            author: author._id,
            body: p.body,
            post_type: p.post_type,
            starts_at: p.starts_at || null,
            ends_at: p.ends_at || null,
            is_published: true,
          },
        },
        { upsert: true }
      )
      console.log(`  Post: "${p.title}" @ ${pc.gym}`)
    }
  }

  // --- Leads ---
  const leadConfigs = [
    { gym: 'iron-paradise', name: 'Mohit Kumar', phone: '9876543210', goal: 'muscle_gain', source: 'gym_page' },
    { gym: 'iron-paradise', name: 'Pooja Verma', phone: '9876543211', goal: 'weight_loss', source: 'walkin' },
    { gym: 'fitzone-agra', name: 'Ravi Gupta', phone: '9876543212', goal: 'general', source: 'gym_page' },
  ]

  for (const l of leadConfigs) {
    const gym = gymDocs[l.gym]
    await Lead.findOneAndUpdate(
      { gym: gym._id, phone: l.phone },
      {
        $set: {
          name: l.name,
          goal: l.goal,
          source: l.source,
          status: 'new',
        },
      },
      { upsert: true }
    )
    console.log(`  Lead: ${l.name} @ ${l.gym}`)
  }

  console.log('\nSeed complete!')
  console.log('\nTest accounts (OTP: 123456):')
  console.log('  Owners:')
  console.log('    +919999999999 - Raj Fitness (Iron Paradise)')
  console.log('    +919999999901 - Priya Wellness (FitZone Agra)')
  console.log('    +919999999902 - Amit Power (PowerHouse Gym)')
  console.log('  Members:')
  console.log('    +919999999903 - Rahul Sharma (Iron Paradise)')
  console.log('    +919999999904 - Sneha Patel (Iron Paradise + FitZone)')
  console.log('    +919999999905 - Vikram Singh (FitZone)')
  console.log('    +919999999906 - Anita Kumari (PowerHouse)')
  console.log('    +919999999907 - Deepak Yadav (Iron Paradise)')

  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
