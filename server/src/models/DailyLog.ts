import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IDailyLog extends Document {
  member: Types.ObjectId
  gym: Types.ObjectId
  date: string  // YYYY-MM-DD
  type: 'workout' | 'diet'
  completed: boolean
}

const dailyLogSchema = new Schema<IDailyLog>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['workout', 'diet'], required: true },
  completed: { type: Boolean, default: true },
})

dailyLogSchema.index({ member: 1, date: 1, type: 1 }, { unique: true })

export const DailyLog = mongoose.model<IDailyLog>('DailyLog', dailyLogSchema)
