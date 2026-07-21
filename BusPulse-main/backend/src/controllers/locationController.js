import Location from '../models/Location.js'
import Trip from '../models/Trip.js'

export const updateLocationByTrip = async (req, res) => {
  const { tripId, latitude, longitude } = req.body
  if (!tripId || latitude == null || longitude == null) {
    return res.status(400).json({ message: 'tripId, latitude, and longitude are required' })
  }

  const trip = await Trip.findById(tripId)
  if (!trip) {
    return res.status(404).json({ message: 'Trip not found' })
  }

  await Location.create({ tripId, latitude, longitude })
  res.json({ message: 'Location updated' })
}

export const updateGeneralLocation = async (req, res) => {
  const data = req.body
  const { lat, lng, speed } = data

  if (lat == null || lng == null) {
    return res.status(400).json({ message: 'lat and lng are required' })
  }

  await Location.create({ 
    latitude: lat, 
    longitude: lng, 
    speed: speed || 40 
  })

  res.json({ message: 'Location updated' })
}

export const getLatestLocation = async (req, res) => {
  const latest = await Location.findOne().sort({ timestamp: -1 }).lean()
  if (!latest) {
    return res.json({
      lat: 16.7440,
      lng: 74.4600,
      speed: 40
    })
  }
  res.json({
    lat: latest.latitude,
    lng: latest.longitude,
    speed: latest.speed || 40
  })
}

export const getActiveLocationsByRoute = async (req, res) => {
  const { routeId } = req.params;
  try {
    const activeTrips = await Trip.find({ routeId, status: 'active' }).populate('busId');
    const tripLocations = [];

    for (const trip of activeTrips) {
      const latestLocation = await Location.findOne({ tripId: trip._id }).sort({ timestamp: -1 });
      if (latestLocation) {
        tripLocations.push({
          tripId: trip._id,
          busNumber: trip.busId?.number || 'Unknown',
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          timestamp: latestLocation.timestamp
        });
      }
    }
    
    res.json(tripLocations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active locations', error: error.message });
  }
}
