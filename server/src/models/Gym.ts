import mongoose, { Schema, Document, Types } from 'mongoose'

interface PlanType {
  id: string
  name: string
}

interface TimingSlot {
  label: string
  open: string
  close: string
}

export interface IGym extends Document {
  owner: Types.ObjectId
  name: string
  slug: string
  city: string
  address: string | null
  phone: string | null
  description: string | null
  logo_url: string | null
  timing_mode: 'slots' | '24x7'
  timing_slots: TimingSlot[]
  plan_types: PlanType[]
  pricing: Record<string, Record<string, number>>
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
  timing_mode: { type: String, enum: ['slots', '24x7'], default: 'slots' },
  timing_slots: {
    type: [{
      label: { type: String, required: true },
      open: { type: String, required: true },
      close: { type: String, required: true },
    }],
    default: [
      { label: 'Morning', open: '06:00', close: '12:00' },
      { label: 'Evening', open: '16:00', close: '22:00' },
    ],
  },
  plan_types: {
    type: [{ id: String, name: String }],
    default: [
      { id: 'strength', name: 'Strength' },
      { id: 'strength_cardio', name: 'Strength + Cardio' },
    ],
  },
  pricing: { type: Schema.Types.Mixed, default: {} },
  facilities: [{ type: String }],
  upi_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

gymSchema.index({ owner: 1 })
gymSchema.index({ name: 1, city: 1 }, { unique: true, sparse: true, collation: { locale: 'en', strength: 2 } })

export const Gym = mongoose.model<IGym>('Gym', gymSchema)
