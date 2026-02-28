import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  phone: string
  role: 'owner' | 'member' | 'admin' | null
  full_name: string | null
  avatar_url: string | null
  created_at: Date
}

const userSchema = new Schema<IUser>({
  phone: { type: String, required: true, unique: true },
  role: { type: String, enum: ['owner', 'member', 'admin', null], default: null },
  full_name: { type: String, default: null },
  avatar_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

export const User = mongoose.model<IUser>('User', userSchema)
