import mongoose from 'mongoose'

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  routeId: { type: String, required: true },
  status: { type: String, enum: ['free', 'busy'], default: 'free' },
  attendanceStatus: { type: String, enum: ['present', 'absent'], default: 'absent' }
})

export default mongoose.model('Driver', driverSchema)
