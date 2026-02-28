import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGym extends Document {
  owner: Types.ObjectId
  name: string
  slug: string
  city: string
  address: string | null
  phone: string | null
  description: string | null
  logo_url: string | null
  opening_time: string | null
  closing_time: string | null
  pricing: Record<string, number>
  facilities: string[]
  upi_id: string | null
  created_at: Date
}

const gymSchema = new Schema<IGym>({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  city: { type: String, default: null },
  address: { type: String, default: null },
  phone: { type: String, default: null },
  description: { type: String, default: null },
  logo_url: { type: String, default: null },
  opening_time: { type: String, default: null },
  closing_time: { type: String, default: null },
  pricing: { type: Schema.Types.Mixed, default: {} },
  facilities: [{ type: String }],
  upi_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

gymSchema.index({ owner: 1 })

export const Gym = mongoose.model<IGym>('Gym', gymSchema)
