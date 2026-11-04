import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import connectDB from './config/db.js'

// Route imports
import authRoutes from './routes/authRoutes.js'
import driverRoutes from './routes/driverRoutes.js'
import busRoutes from './routes/busRoutes.js'
import tripRoutes from './routes/tripRoutes.js'
import locationRoutes from './routes/locationRoutes.js'
import extraBusRoutes from './routes/extraBusRoutes.js'
import routeRoutes from './routes/routeRoutes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const app = express()
app.use(cors())
app.use(express.json())

// Mount routers
app.use('/', authRoutes)
app.use('/', driverRoutes)
app.use('/', busRoutes)
app.use('/', tripRoutes)
app.use('/', locationRoutes)
app.use('/', extraBusRoutes)
app.use('/', routeRoutes)

import { getLocalNetworkIp } from './utils/network.js'

const PORT = process.env.PORT || 5000

// Connect to Database and Seed
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    const lanIp = getLocalNetworkIp()
    console.log(`🚍 BusPulse server running on:`)
    console.log(`   - Local:   http://localhost:${PORT}`)
    console.log(`   - Network: http://${lanIp}:${PORT}`)
  })
})
