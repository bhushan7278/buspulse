import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Bus, UploadCloud, Users, MapPin, CheckCircle, XCircle, ChevronDown, Activity, Zap } from 'lucide-react'
import L from 'leaflet'
import api from '../api'

// Fix default icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

function MapUpdater({ activeLocations }) {
  const map = useMap()
  useEffect(() => {
    if (activeLocations && activeLocations.length > 0) {
      if (activeLocations.length === 1) {
        map.setView([activeLocations[0].latitude, activeLocations[0].longitude], 14)
      } else {
        const bounds = L.latLngBounds(activeLocations.map(loc => [loc.latitude, loc.longitude]))
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [activeLocations, map])
  return null
}

export default function ExtraBus() {
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeLocations, setActiveLocations] = useState([])
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await api.get('/routes')
        setRoutes(response.data)
      } catch (err) {
        console.error('Failed to load routes:', err)
      }
    }
    fetchRoutes()
  }, [])

  useEffect(() => {
    if (!selectedRoute) {
      setActiveLocations([])
      return
    }

    const fetchLocations = async () => {
      try {
        const response = await api.get(`/locations/active/${selectedRoute}`)
        setActiveLocations(response.data)
      } catch (err) {
        console.error('Failed to load active locations:', err)
      }
    }

    fetchLocations()
    const interval = setInterval(fetchLocations, 3000) // Refresh every 3s
    return () => clearInterval(interval)
  }, [selectedRoute])

  const handleImageChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setImages((prev) => {
        const combined = [...prev, ...newFiles]
        return combined.slice(0, 4) // max 4
      })
      // Clear input so same file can be selected again if removed
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleEvaluate = async () => {
    if (!selectedRoute) {
      alert('Please select a route first')
      return
    }
    if (images.length !== 4) {
      alert('Please upload exactly 4 images for YOLO evaluation')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('routeId', selectedRoute)
    images.forEach((img) => formData.append('images', img))

    try {
      const response = await api.post('/extra-bus/evaluate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      navigate('/extra-bus-result', { state: { result: response.data } })
    } catch (err) {
      console.error('Evaluation failed:', err)
      alert(err?.response?.data?.message || 'Evaluation failed. Make sure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20">
              <Zap className="h-3.5 w-3.5 text-indigo-400" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">AI Analytics & Fleet</p>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Extra Bus Intelligence</h2>
          <p className="mt-2 text-slate-400 max-w-2xl text-sm sm:text-base">
            Optimize your fleet with YOLO-powered passenger detection. Evaluate live camera feeds to dynamically deploy extra buses exactly when and where they're needed.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Controls & Result */}
        <div className="flex flex-col gap-6 lg:col-span-5 relative z-10">
          
          {/* Controls Card */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <h3 className="mb-6 flex items-center gap-3 text-xl font-semibold text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-inner">
                <Activity className="h-5 w-5 text-white" />
              </span>
              Evaluation Parameters
            </h3>

            <div className="space-y-6">
              {/* Route Selection */}
              <div className="group">
                <label className="mb-2.5 block text-sm font-medium text-slate-300 transition-colors group-focus-within:text-indigo-400">
                  Select Active Route
                </label>
                <div className="relative">
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-800/80 px-5 py-4 text-white shadow-inner outline-none transition-all focus:border-indigo-500 focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/20"
                  >
                    <option value="" className="bg-slate-800 text-slate-400">-- Choose a Route --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id} className="bg-slate-800">{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-400" />
                </div>
              </div>

              {/* Upload Section */}
              <div className="group">
                <label className="mb-2.5 block text-sm font-medium text-slate-300 transition-colors group-hover:text-indigo-400">
                  Upload Bus CCTV Feed (4 Frames)
                </label>
                <div 
                  className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-slate-800/50 py-10 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5 group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="mb-4 rounded-full bg-slate-700/50 p-4 shadow-sm ring-1 ring-white/10 transition-transform group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:ring-indigo-500/50">
                      <UploadCloud className="h-8 w-8 text-indigo-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">Click to browse or drag and drop</p>
                    <p className="mt-1 text-xs text-slate-400">Please provide exactly 4 clear images (JPEG/PNG)</p>
                  </div>
                  
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                </div>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="mt-4 flex gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="group/img relative h-20 w-20 overflow-hidden rounded-xl border border-white/10 shadow-sm transition-all hover:scale-105 hover:ring-2 hover:ring-indigo-500">
                        <img 
                          src={URL.createObjectURL(img)} 
                          alt={`Upload ${idx}`} 
                          className="h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-110" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover/img:opacity-100 flex items-center justify-center">
                          <button
                            onClick={() => removeImage(idx)}
                            className="text-white hover:text-red-400 transition-colors"
                            title="Remove image"
                          >
                            <XCircle className="h-6 w-6" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleEvaluate}
                disabled={loading}
                className="group relative mt-4 w-full overflow-hidden rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Analyzing with YOLOv8...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      Evaluate & Find Extra Bus
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Map */}
        <div className="flex h-[400px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-xl lg:col-span-7">
          <div className="flex items-center justify-between border-b border-white/5 bg-slate-800/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
              </span>
              <h3 className="font-semibold text-white">Live Fleet Tracking</h3>
            </div>
            {selectedRoute && (
              <div className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
                {activeLocations.length} Active Bus{activeLocations.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>
          
          <div className="relative flex-1 bg-slate-800 z-10 w-full h-full">
            {!selectedRoute ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="max-w-sm rounded-3xl border border-white/5 bg-slate-900/80 p-10 shadow-2xl backdrop-blur-md">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                    <MapPin className="h-8 w-8 text-slate-500" />
                  </div>
                  <h4 className="text-lg font-bold text-white">No Route Selected</h4>
                  <p className="mt-2 text-sm text-slate-400">Select a route from the panel to view active bus locations on the live map.</p>
                </div>
              </div>
            ) : (
              <MapContainer 
                center={[16.6961, 74.2435]} // roughly Kolhapur
                zoom={11} 
                style={{ height: '100%', width: '100%', zIndex: 10 }}
              >
                <MapUpdater activeLocations={activeLocations} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {activeLocations.map((loc, i) => (
                  <Marker key={i} position={[loc.latitude, loc.longitude]} icon={busIcon}>
                    <Popup className="custom-popup">
                      <div className="font-semibold text-slate-800">Bus: <span className="text-indigo-600">{loc.busNumber}</span></div>
                      <div className="text-xs text-slate-500">Trip ID: {loc.tripId}</div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
