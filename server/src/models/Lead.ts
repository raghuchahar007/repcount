import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ILead extends Document {
  gym: Types.ObjectId
  user: Types.ObjectId | null
  name: string
  phone: string
  goal: string | null
  source: 'gym_page' | 'referral' | 'trial' | 'walkin' | 'other' | 'app_request' | 'owner_invite'
  referrer: Types.ObjectId | null
  status: 'new' | 'contacted' | 'converted' | 'lost'
  notes: string | null
  created_at: Date
}

const leadSchema = new Schema<ILead>({
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  goal: { type: String, default: null },
  source: { type: String, enum: ['gym_page', 'referral', 'trial', 'walkin', 'other', 'app_request', 'owner_invite'], default: 'other' },
  referrer: { type: Schema.Types.ObjectId, ref: 'Member', default: null },
  status: { type: String, enum: ['new', 'contacted', 'converted', 'lost'], default: 'new' },
  notes: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

leadSchema.index({ gym: 1, status: 1 })
leadSchema.index({ gym: 1, created_at: -1 })
leadSchema.index({ gym: 1, user: 1 }, { unique: true, sparse: true })

export const Lead = mongoose.model<ILead>('Lead', leadSchema)
