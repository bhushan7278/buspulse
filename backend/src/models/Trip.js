import mongoose from 'mongoose'

const tripSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  routeId: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  phase: {
    type: String,
    enum: ['OUTBOUND', 'DESTINATION_STOP', 'RETURNING', 'COMPLETED'],
    default: 'OUTBOUND'
  },
  outboundDepartureTime: { type: Date, default: () => new Date() },
  destinationArrivalTime: { type: Date, default: null },
  stopDurationMinutes: { type: Number, default: 15 },
  expectedReturnDepartureTime: { type: Date, default: null },
  returnDepartureTime: { type: Date, default: null },
  actualSangliArrivalTime: { type: Date, default: null },
  startTime: { type: Date, default: () => new Date() },
  endTime: { type: Date, default: null }
}, { timestamps: true })

export default mongoose.model('Trip', tripSchema)
