import mongoose from 'mongoose'

const busSchema = new mongoose.Schema({
  number: { type: String, required: true },
  routeId: { type: String, required: true },
  status: { type: String, enum: ['free', 'busy'], default: 'free' }
})

export default mongoose.model('Bus', busSchema)
