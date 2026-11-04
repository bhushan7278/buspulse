import { SANGLI_ALLOWED_ROUTES } from './utils/routeConfig'

export const routes = SANGLI_ALLOWED_ROUTES.map(r => ({
  id: r.id,
  code: r.code,
  name: r.name,
  label: r.label || r.name,
  origin: r.origin,
  destination: r.destination,
  returnDestination: r.returnDestination,
  waypoints: r.waypoints,
  returnWaypoints: r.returnWaypoints,
  totalDistanceKm: r.totalDistanceKm,
  returnDistanceKm: r.returnDistanceKm
}))

export default routes
