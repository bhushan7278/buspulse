import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'

dotenv.config({ path: path.join(process.cwd(), '.env') })

async function executeAdminReset() {
  await mongoose.connect(process.env.MONGO_URI)
  const db = mongoose.connection.db

  console.log('--- EXECUTING ADMINISTRATOR-ONLY DATA RESET ---')

  // 1. Delete admin records
  const adminDeleteResult = await db.collection('admins').deleteMany({})
  console.log(`Deleted ${adminDeleteResult.deletedCount} administrator account record(s) from collection "admins".`)

  // 2. Delete OTP challenges
  const otpDeleteResult = await db.collection('otpchallenges').deleteMany({})
  console.log(`Deleted ${otpDeleteResult.deletedCount} challenge record(s) from collection "otpchallenges".`)

  // 3. Safe Reconciliation of Orphaned Busy Drivers/Buses
  const activeTrips = await db.collection('trips').find({ status: 'active' }).toArray()
  const activeDriverIds = activeTrips.map(t => t.driverId?.toString()).filter(Boolean)
  const activeBusIds = activeTrips.map(t => t.busId?.toString()).filter(Boolean)

  const activeDriverObjIds = activeDriverIds.map(id => new mongoose.Types.ObjectId(id))
  const orphanedDrivers = await db.collection('drivers').find({
    status: 'busy',
    _id: { $nin: activeDriverObjIds }
  }).toArray()

  if (orphanedDrivers.length > 0) {
    const updateResult = await db.collection('drivers').updateMany(
      { _id: { $in: orphanedDrivers.map(d => d._id) } },
      { $set: { status: 'free' } }
    )
    console.log(`Reconciled ${updateResult.modifiedCount} orphaned busy driver(s) to "free". Attendance status preserved.`)
  }

  const activeBusObjIds = activeBusIds.map(id => new mongoose.Types.ObjectId(id))
  const orphanedBuses = await db.collection('buses').find({
    status: 'busy',
    _id: { $nin: activeBusObjIds },
    isDeleted: { $ne: true }
  }).toArray()

  if (orphanedBuses.length > 0) {
    const updateBusResult = await db.collection('buses').updateMany(
      { _id: { $in: orphanedBuses.map(b => b._id) } },
      { $set: { status: 'free' } }
    )
    console.log(`Reconciled ${updateBusResult.modifiedCount} orphaned busy bus(es) to "free".`)
  }

  // 4. Verify post-reset database integrity
  console.log('\n--- VERIFICATION OF PRESERVED COLLECTIONS ---')
  const collections = await db.listCollections().toArray()
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments()
    console.log(`  - ${c.name}: ${count} documents`)
  }

  await mongoose.disconnect()
  console.log('\nReset and reconciliation completed successfully.')
}

executeAdminReset().catch(err => {
  console.error('Reset execution failed:', err)
  process.exit(1)
})
