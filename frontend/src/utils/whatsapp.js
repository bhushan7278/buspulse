/**
 * WhatsApp Live GPS Tracking Link & Message Builder
 * Sangli MSRTC Depot System
 * 
 * Strict formatting rules:
 * 1. Plain text title (no markdown asterisks or quotes).
 * 2. Standalone URL with a blank line before and after.
 * 3. No trailing characters, brackets, or punctuation touching the URL.
 * 4. Complete URL format: http://<LAN_IP>:5173/track?tripId=<ACTUAL_TRIP_ID>
 * 5. Single-encoded for wa.me query parameters (no double encoding).
 */

/**
 * Constructs the standardized WhatsApp Live GPS Tracking message.
 * Matches exact format:
 * 
 * BusPulse MSRTC Sangli Depot Live GPS Tracking
 * 
 * Trip ID: ACTUAL_TRIP_ID
 * Route: Sangli → Kolhapur
 * Bus: BUS-101
 * 
 * Open the tracking page using this link:
 * 
 * http://10.179.53.225:5173/track?tripId=ACTUAL_TRIP_ID
 * 
 * Keep the tracking page open while sharing your live location.
 */
export const buildWhatsAppTrackingMessage = ({
  tripId,
  routeName,
  busNumber,
  trackingUrl
}) => {
  return [
    'BusPulse MSRTC Sangli Depot Live GPS Tracking',
    '',
    `Trip ID: ${tripId}`,
    `Route: ${routeName}`,
    `Bus: ${busNumber}`,
    '',
    'Open the tracking page using this link:',
    '',
    trackingUrl,
    '',
    'Keep the tracking page open while sharing your live location.'
  ].join('\n')
}

/**
 * Formats phone number for WhatsApp Click-to-Chat (wa.me)
 * Strips non-digits and ensures international prefix (default 91 for India).
 */
export const formatWhatsAppPhone = (phoneStr) => {
  if (!phoneStr) return ''
  const digits = String(phoneStr).replace(/\D/g, '')
  if (digits.length === 10) {
    return `91${digits}`
  }
  return digits
}

/**
 * Generates the full WhatsApp Click-to-Chat URL
 * Encodes the whole message text exactly once for the query string parameter.
 */
export const buildWhatsAppClickToChatUrl = ({ phone, messageText }) => {
  const formattedPhone = formatWhatsAppPhone(phone)
  const encodedText = encodeURIComponent(messageText)
  return `https://wa.me/${formattedPhone}?text=${encodedText}`
}
