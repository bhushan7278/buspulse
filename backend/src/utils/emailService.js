import nodemailer from 'nodemailer'

/**
 * Checks whether SMTP credentials are adequately configured in environment
 */
export const isSmtpConfigured = () => {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return false
  if (pass.includes('YOUR_GMAIL_APP_PASSWORD') || pass.trim() === '') return false
  return true
}

let testTransporter = null

/**
 * Sets a custom transporter for test verification
 */
export const setTestTransporter = (transporter) => {
  testTransporter = transporter
}

/**
 * Creates and returns a Nodemailer transporter instance
 */
const createTransporter = () => {
  if (testTransporter) {
    return testTransporter
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const secure = process.env.SMTP_SECURE === 'true' || port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

/**
 * Sends an administrator registration MD Approval OTP exclusively to the Managing Director email
 * @param {Object} options
 * @param {string} options.to Managing Director approval recipient email address
 * @param {string} options.otp 6-digit verification code
 * @param {string} options.username Applicant username
 * @param {string} options.msrtcId Applicant MSRTC ID
 * @param {string} options.applicantEmail Applicant personal contact email
 * @param {number} [options.expiryMinutes=5] OTP lifetime in minutes
 */
export const sendRegistrationOtpEmail = async ({
  to,
  otp,
  username,
  msrtcId,
  applicantEmail = 'N/A',
  expiryMinutes = 5
}) => {
  if (!testTransporter && !isSmtpConfigured()) {
    const errorMsg = 'SMTP credentials are not configured. Please set valid SMTP_USER and SMTP_PASS (Gmail App Password) in backend/.env.'
    return { success: false, error: errorMsg }
  }

  const transporter = createTransporter()

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #0284c7, #6366f1); padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; color: #ffffff; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; color: #e0f2fe; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; }
          .content { padding: 32px 24px; }
          .greeting { font-size: 16px; color: #cbd5e1; margin-bottom: 12px; }
          .desc { color: #94a3b8; line-height: 1.5; font-size: 14px; margin-bottom: 20px; }
          .details { background-color: #0f172a; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #334155; }
          .detail-row { display: flex; justify-content: space-between; font-size: 14px; margin: 8px 0; color: #94a3b8; }
          .detail-val { color: #f1f5f9; font-weight: 600; }
          .otp-box { text-align: center; margin: 28px 0; padding: 24px; background-color: #0f172a; border: 2px dashed #38bdf8; border-radius: 12px; }
          .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; margin: 0; }
          .otp-expiry { color: #f59e0b; font-size: 13px; font-weight: 600; margin-top: 10px; }
          .warning { background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #fca5a5; margin-top: 24px; line-height: 1.4; }
          .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>BusPulse Transport Management</h1>
            <p>Managing Director (MD) Registration Approval</p>
          </div>
          <div class="content">
            <p class="greeting">Respected Managing Director,</p>
            <p class="desc">
              An applicant has initiated a registration request for Administrator Clearance on the BusPulse Smart Bus & Fleet Management System. This registration requires your executive authorization.
            </p>
            <div class="details">
              <div class="detail-row"><span>Applicant Username:</span> <span class="detail-val">${username}</span></div>
              <div class="detail-row"><span>Applicant MSRTC ID:</span> <span class="detail-val">${msrtcId}</span></div>
              <div class="detail-row"><span>Applicant Contact Email:</span> <span class="detail-val">${applicantEmail}</span></div>
              <div class="detail-row"><span>Requested Clearance:</span> <span class="detail-val">Depot Administrator</span></div>
            </div>
            <div class="otp-box">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 8px;">Executive Approval One-Time Passcode</div>
              <div class="otp-code">${otp}</div>
              <div class="otp-expiry">⏱ Valid for ${expiryMinutes} minutes only</div>
            </div>
            <div class="warning">
              <strong>Authorization Policy:</strong> To approve this administrator, provide the six-digit authorization code above to the applicant. If you do not recognize or approve this applicant, disregard this notification.
            </div>
          </div>
          <div class="footer">
            BusPulse AI Transport Management System &bull; Executive Clearance Security Service
          </div>
        </div>
      </body>
    </html>
  `

  const textContent = `
BusPulse Managing Director (MD) Registration Approval
------------------------------------------------------
Respected Managing Director,

An applicant has requested Administrator Clearance on BusPulse:

Applicant Username:      ${username}
Applicant MSRTC ID:       ${msrtcId}
Applicant Contact Email:  ${applicantEmail}
Requested Clearance:      Depot Administrator

EXECUTIVE APPROVAL CODE: ${otp}
(Valid for ${expiryMinutes} minutes only)

To approve this registration, provide this 6-digit passcode to the applicant. If you do not authorize this request, ignore this message.
`

  try {
    const info = await transporter.sendMail({
      from: `"BusPulse Security" <${process.env.SMTP_USER}>`,
      to,
      subject: `[MD Approval Required] BusPulse Admin Registration: ${otp.slice(0, 3)}-${otp.slice(3)}`,
      text: textContent,
      html: htmlContent
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    return { success: false, error: `Email delivery failed: ${error.message}` }
  }
}
