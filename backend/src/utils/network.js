import os from 'os'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '..', '.env') })

/**
 * Checks if a URL, hostname, or IP address is a loopback address
 */
export const isLoopbackAddress = (urlOrHost) => {
  if (!urlOrHost || typeof urlOrHost !== 'string') return true
  const lower = urlOrHost.toLowerCase().trim()
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('nip.io') ||
    lower.includes('::1')
  )
}

/**
 * Returns the non-internal IPv4 LAN address of the host machine (e.g. 10.x.x.x or 192.168.x.x)
 */
export const getLocalNetworkIp = () => {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

/**
 * Resolves the mobile-accessible tracking base URL.
 * Guarantees that loopback addresses (localhost/127.0.0.1) are NEVER returned for mobile WhatsApp tracking.
 */
export const getPublicTrackingBaseUrl = () => {
  // 1. Check explicit PUBLIC_TRACKING_URL in environment (or VITE_PUBLIC_TRACKING_URL)
  const explicitPublicUrl = process.env.PUBLIC_TRACKING_URL || process.env.VITE_PUBLIC_TRACKING_URL
  if (explicitPublicUrl && explicitPublicUrl.trim() !== '' && !isLoopbackAddress(explicitPublicUrl)) {
    return explicitPublicUrl.trim().replace(/\/+$/, '')
  }

  // 2. Check FRONTEND_URL if it is non-loopback (e.g. custom domain or tunnel)
  const frontendEnv = process.env.FRONTEND_URL
  if (frontendEnv && frontendEnv.trim() !== '' && !isLoopbackAddress(frontendEnv)) {
    return frontendEnv.trim().replace(/\/+$/, '')
  }

  // 3. Fallback to host's LAN IPv4 address so phones on the same Wi-Fi can connect directly
  const localIp = getLocalNetworkIp()
  if (localIp && !isLoopbackAddress(localIp)) {
    return `http://${localIp}:5173`
  }

  // 4. Default safe fallback
  return `http://${localIp}:5173`
}

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
