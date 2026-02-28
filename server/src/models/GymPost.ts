import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGymPost extends Document {
  gym: Types.ObjectId
  author: Types.ObjectId
  title: string
  body: string | null
  post_type: 'challenge' | 'event' | 'offer' | 'announcement'
  image_url: string | null
  starts_at: Date | null
  ends_at: Date | null
  is_published: boolean
  participants: Types.ObjectId[]
  created_at: Date
}

const gymPostSchema = new Schema<IGymPost>({
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, default: null },
  post_type: { type: String, enum: ['challenge', 'event', 'offer', 'announcement'], required: true },
  image_url: { type: String, default: null },
  starts_at: { type: Date, default: null },
  ends_at: { type: Date, default: null },
  is_published: { type: Boolean, default: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'Member' }],
  created_at: { type: Date, default: Date.now },
})

gymPostSchema.index({ gym: 1, created_at: -1 })

export const GymPost = mongoose.model<IGymPost>('GymPost', gymPostSchema)
