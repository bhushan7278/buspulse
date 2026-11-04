import mongoose from 'mongoose'
import { buildSeedData } from '../utils/seedData.js'

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-bus-system'
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅ MongoDB connected successfully')
    await buildSeedData()
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    process.exit(1)
  }
}

export default connectDB
