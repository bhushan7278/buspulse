import mongoose from 'mongoose'

const locationSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: false },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  speed: { type: Number, required: false },
  timestamp: { type: Date, default: () => new Date() }
})

export default mongoose.model('Location', locationSchema)
