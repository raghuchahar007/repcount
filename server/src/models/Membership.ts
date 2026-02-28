import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IMembership extends Document {
  member: Types.ObjectId
  gym: Types.ObjectId
  plan_type: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
  amount: number
  start_date: Date
  expiry_date: Date
  payment_method: 'cash' | 'upi' | 'card' | 'online'
  status: 'active' | 'expired' | 'cancelled'
  paid_at: Date
  created_at: Date
}

const membershipSchema = new Schema<IMembership>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  plan_type: { type: String, enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'], required: true },
  amount: { type: Number, required: true },
  start_date: { type: Date, required: true },
  expiry_date: { type: Date, required: true },
  payment_method: { type: String, enum: ['cash', 'upi', 'card', 'online'], default: 'cash' },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  paid_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
})

membershipSchema.index({ member: 1, expiry_date: -1 })
membershipSchema.index({ gym: 1, status: 1 })
membershipSchema.index({ gym: 1, paid_at: -1 })

export const Membership = mongoose.model<IMembership>('Membership', membershipSchema)
