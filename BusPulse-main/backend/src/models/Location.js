import mongoose from 'mongoose'

const locationSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  timestamp: { type: Date, default: () => new Date() }
})

export default mongoose.model('Location', locationSchema)
