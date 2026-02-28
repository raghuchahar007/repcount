import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IAttendance extends Document {
  member: Types.ObjectId
  gym: Types.ObjectId
  check_in_date: Date
  checked_in_at: Date
}

const attendanceSchema = new Schema<IAttendance>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  check_in_date: { type: Date, required: true },
  checked_in_at: { type: Date, default: Date.now },
})

attendanceSchema.index({ member: 1, gym: 1, check_in_date: 1 }, { unique: true })
attendanceSchema.index({ gym: 1, check_in_date: -1 })
attendanceSchema.index({ member: 1, checked_in_at: -1 })

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema)
