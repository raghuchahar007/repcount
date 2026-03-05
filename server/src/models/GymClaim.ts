import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGymClaim extends Document {
  gym: Types.ObjectId
  claimant_name: string
  claimant_phone: string
  claimant_email: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: Date
}

const gymClaimSchema = new Schema<IGymClaim>({
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  claimant_name: { type: String, required: true },
  claimant_phone: { type: String, required: true },
  claimant_email: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  created_at: { type: Date, default: Date.now },
})

gymClaimSchema.index({ gym: 1, status: 1 })
gymClaimSchema.index({ created_at: -1 })

export const GymClaim = mongoose.model<IGymClaim>('GymClaim', gymClaimSchema)
