import mongoose from 'mongoose'

const tripSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  routeId: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  startTime: { type: Date, default: () => new Date() },
  endTime: { type: Date }
}, { timestamps: true })

export default mongoose.model('Trip', tripSchema)
