import Driver from '../models/Driver.js'
import Bus from '../models/Bus.js'

export const routes = [
  { id: 'R1', name: 'Kolhapur to Sangli' },
  { id: 'R2', name: 'Sangli to Kolhapur' },
  { id: 'R3', name: 'Route 3 - City Loop' }
]

export const buildSeedData = async () => {
  const driverCount = await Driver.countDocuments()
  const busCount = await Bus.countDocuments()

  if (driverCount > 0 || busCount > 0) {
    return
  }

  await Driver.create([
    { name: 'Prasad Bharmal', phone: '+918237917634', routeId: 'R1' },
    { name: 'Vishal Asabe', phone: '+918767059963', routeId: 'R1' },
    { name: 'Pranav Yadav', phone: '+919284572736', routeId: 'R1' },
    { name: 'Pranav Chougule', phone: '+917796487321', routeId: 'R1' },
    { name: 'Sai Kothwal', phone: '+919325897517', routeId: 'R1' },
    { name: 'Pranav Kamble', phone: '+917498302067', routeId: 'R2' },
    { name: 'Vivek Gudalkar', phone: '+918624862135', routeId: 'R2' },
    { name: 'Harshad Gurav', phone: '+919373166257', routeId: 'R2' },
    { name: 'Vedant Telsinge', phone: '+918177843484', routeId: 'R2' },
    { name: 'Devraj Vagare', phone: '+917498074387', routeId: 'R2' }
  ])

  await Bus.create([
    { number: 'BUS-101', routeId: 'R1' },
    { number: 'BUS-102', routeId: 'R1' },
    { number: 'BUS-201', routeId: 'R2' },
    { number: 'BUS-301', routeId: 'R3' }
  ])
}
