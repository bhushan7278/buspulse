import Bus from '../models/Bus.js'

export const getAvailableBusesByRoute = async (req, res) => {
  const { routeId } = req.params
  const buses = await Bus.find({ routeId, status: 'free' }).sort('number')
  res.json(buses)
}

export const getBusyBusesByRoute = async (req, res) => {
  const { routeId } = req.params
  const buses = await Bus.find({ routeId, status: 'busy' }).sort('number')
  res.json(buses)
}
