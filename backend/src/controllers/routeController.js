import { routes, buildSeedData } from '../utils/seedData.js'

export const getRoutesList = (req, res) => {
  return res.json(routes)
}

export const seedDatabase = async (req, res) => {
  await buildSeedData()
  res.json({ message: 'Seed data created' })
}
