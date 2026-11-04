import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  routeId: { type: String, required: false, default: null },
  date: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent'], default: 'present' },
  checkInTime: { type: Date, default: () => new Date() },
  checkOutTime: { type: Date, default: null }
}, { timestamps: true })

// Enforce one attendance record per driver per date at the database level
attendanceSchema.index({ driverId: 1, date: 1 }, { unique: true })

export default mongoose.model('Attendance', attendanceSchema)
