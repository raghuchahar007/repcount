import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IBadge {
  badge_type: string
  earned_at: Date
}

export interface IMember extends Document {
  user: Types.ObjectId | null
  gym: Types.ObjectId
  name: string
  phone: string
  goal: 'weight_loss' | 'muscle_gain' | 'general'
  diet_pref: 'veg' | 'nonveg' | 'egg'
  budget: 'low' | 'medium' | 'high'
  join_date: Date
  dob: Date | null
  emergency_phone: string | null
  notes: string | null
  is_active: boolean
  badges: IBadge[]
  created_at: Date
}

const badgeSchema = new Schema<IBadge>({
  badge_type: { type: String, required: true },
  earned_at: { type: Date, default: Date.now },
}, { _id: false })

const memberSchema = new Schema<IMember>({
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  goal: { type: String, enum: ['weight_loss', 'muscle_gain', 'general'], default: 'general' },
  diet_pref: { type: String, enum: ['veg', 'nonveg', 'egg'], default: 'veg' },
  budget: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  join_date: { type: Date, default: Date.now },
  dob: { type: Date, default: null },
  emergency_phone: { type: String, default: null },
  notes: { type: String, default: null },
  is_active: { type: Boolean, default: true },
  badges: [badgeSchema],
  created_at: { type: Date, default: Date.now },
})

memberSchema.index({ gym: 1, is_active: 1 })
memberSchema.index({ gym: 1, phone: 1 }, { unique: true })
memberSchema.index({ user: 1 })

export const Member = mongoose.model<IMember>('Member', memberSchema)
