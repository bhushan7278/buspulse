import mongoose from 'mongoose'

const busSchema = new mongoose.Schema({
  number: { type: String, required: true, trim: true },
  routeId: { type: String, required: false, default: null }, // Optional default assignment; fleet availability is global
  status: { type: String, enum: ['free', 'busy'], default: 'free' },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model('Bus', busSchema)
