import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  phone: string | null
  email: string | null
  password_hash: string | null
  role: 'owner' | 'member' | 'admin' | null
  full_name: string | null
  avatar_url: string | null
  created_at: Date
}

const userSchema = new Schema<IUser>({
  phone: { type: String, default: null, sparse: true, unique: true },
  email: { type: String, default: null, sparse: true, unique: true },
  password_hash: { type: String, default: null },
  role: { type: String, enum: ['owner', 'member', 'admin', null], default: null },
  full_name: { type: String, default: null },
  avatar_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

export const User = mongoose.model<IUser>('User', userSchema)
