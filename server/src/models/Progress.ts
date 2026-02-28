import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IProgress extends Document {
  member: Types.ObjectId
  metric: string
  value: number
  recorded_at: Date
}

const progressSchema = new Schema<IProgress>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  metric: { type: String, required: true },
  value: { type: Number, required: true },
  recorded_at: { type: Date, default: Date.now },
})

progressSchema.index({ member: 1, metric: 1, recorded_at: -1 })

export const Progress = mongoose.model<IProgress>('Progress', progressSchema)
