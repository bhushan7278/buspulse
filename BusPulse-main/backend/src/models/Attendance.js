import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  routeId: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent'], default: 'present' }
}, { timestamps: true })

export default mongoose.model('Attendance', attendanceSchema)
