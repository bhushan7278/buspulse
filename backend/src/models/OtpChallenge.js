import mongoose from 'mongoose'

const otpChallengeSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  msrtcId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  otpHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastSentAt: {
    type: Date,
    default: () => new Date()
  }
}, { timestamps: true })

otpChallengeSchema.index({ username: 1, msrtcId: 1 })

export default mongoose.model('OtpChallenge', otpChallengeSchema)
