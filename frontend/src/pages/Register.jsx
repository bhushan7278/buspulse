import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Mail,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Bus,
  Clock,
  KeyRound
} from 'lucide-react'
import api from '../api'

export default function Register() {
  // Step 1: Details, Step 2: MD Approval OTP verification, Step 3: Registration Complete
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({
    username: '',
    msrtcId: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // OTP and policy state
  const [otp, setOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [policyStatus, setPolicyStatus] = useState({
    loading: true,
    registrationOpen: true,
    targetEmail: 'bhu***1@gmail.com'
  })

  // Validation & alerts
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [serverSuccess, setServerSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  // Fetch registration policy status and target MD email mask
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await api.get('/auth/admin/status')
        setPolicyStatus({
          loading: false,
          registrationOpen: response.data?.registrationOpen ?? true,
          targetEmail: response.data?.targetEmail || 'bhu***1@gmail.com',
          message: response.data?.message
        })
      } catch {
        setPolicyStatus({
          loading: false,
          registrationOpen: true,
          targetEmail: 'bhu***1@gmail.com'
        })
      }
    }
    checkStatus()
  }, [])

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
    if (serverError) setServerError(null)
  }

  const validateStep1 = () => {
    const newErrors = {}
    const username = formData.username.trim()
    const msrtcId = formData.msrtcId.trim()
    const email = formData.email.trim()

    if (!username) {
      newErrors.username = 'Username is required.'
    } else if (username.length < 3 || username.length > 30) {
      newErrors.username = 'Username must be between 3 and 30 characters.'
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Only letters, numbers, and underscores are allowed.'
    }

    if (!msrtcId) {
      newErrors.msrtcId = 'MSRTC ID is required.'
    } else if (msrtcId.length < 3 || msrtcId.length > 30) {
      newErrors.msrtcId = 'MSRTC ID must be between 3 and 30 characters.'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      newErrors.email = 'Personal contact email is required.'
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid personal contact email address.'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmation password is required.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Step 1 -> Request MD Approval OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!validateStep1()) return

    setLoading(true)
    setServerError(null)
    setServerSuccess(null)

    try {
      const response = await api.post('/auth/admin/register/request-otp', {
        username: formData.username.trim(),
        msrtcId: formData.msrtcId.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      })

      if (response.data?.targetEmail) {
        setPolicyStatus(prev => ({ ...prev, targetEmail: response.data.targetEmail }))
      }

      setServerSuccess(
        response.data?.message ||
        'An administrator registration approval OTP has been sent to the designated MD email address. Registration requires MD authorization.'
      )
      setCooldown(response.data?.cooldownSeconds || 60)
      setStep(2)
    } catch (err) {
      console.error('Request OTP error:', err)
      const msg = err.response?.data?.message || 'Failed to dispatch approval OTP to Managing Director. Please try again.'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Step 2 -> Verify MD Approval OTP and complete registration
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp.trim()) {
      setErrors({ otp: 'Please enter the 6-digit MD approval code.' })
      return
    }
    if (otp.trim().length !== 6) {
      setErrors({ otp: 'MD approval code must be exactly 6 digits.' })
      return
    }

    setLoading(true)
    setServerError(null)

    try {
      await api.post('/auth/admin/register/verify-otp', {
        username: formData.username.trim(),
        msrtcId: formData.msrtcId.trim(),
        otp: otp.trim()
      })

      setStep(3)
    } catch (err) {
      console.error('Verify OTP failed:', err)
      const msg = err.response?.data?.message || 'Invalid or expired Managing Director approval code.'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Resend MD Approval OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return
    setLoading(true)
    setServerError(null)
    setServerSuccess(null)

    try {
      const response = await api.post('/auth/admin/register/request-otp', {
        username: formData.username.trim(),
        msrtcId: formData.msrtcId.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      })
      setServerSuccess(
        response.data?.message ||
        'A fresh approval OTP has been dispatched to the Managing Director email address.'
      )
      setCooldown(response.data?.cooldownSeconds || 60)
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to resend approval OTP to Managing Director.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-[85vh] w-full flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-lg">
        {/* Branding Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2A202E] text-[#6173F4] ring-1 ring-[#6173F4]/50 shadow-lg">
            <Bus className="h-8 w-8" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#6173F4]">Security Clearance</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#FCEFED] sm:text-4xl">Admin Registration</h1>
          <p className="mt-2 text-sm text-[#FCEFED]/70">
            {step === 1 && 'Establish administrator credentials with Managing Director executive authorization.'}
            {step === 2 && 'Enter the authorized MD verification code to complete account registration.'}
            {step === 3 && 'Account authorization complete.'}
          </p>
        </div>

        {/* Closed Registration Notice (Fallback) */}
        {!policyStatus.loading && !policyStatus.registrationOpen && (
          <div className="overflow-hidden rounded-[2.5rem] border border-[#E7D3D0] bg-[#FCEFED] p-8 sm:p-10 text-[#3B2E40] shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2A202E] text-[#6173F4] ring-1 ring-[#6173F4]/40">
              <AlertCircle className="h-7 w-7 text-[#F35E3E]" />
            </div>
            <h2 className="text-2xl font-black text-[#3B2E40]">Registration Temporarily Closed</h2>
            <p className="mt-3 text-sm text-[#3B2E40]/75 leading-relaxed max-w-md mx-auto">
              Administrator onboarding is currently paused. Please sign in or contact the Managing Director.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#F35E3E] px-8 py-3.5 text-sm font-bold text-[#FCEFED] shadow-lg transition hover:bg-[#E04D2E]"
              >
                <span>Login to Portal</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Registration Card: Shell Light Surface */}
        {(policyStatus.loading || policyStatus.registrationOpen) && (
          <div className="overflow-hidden rounded-[2.5rem] border border-[#E7D3D0] bg-[#FCEFED] p-8 shadow-2xl sm:p-10 text-[#3B2E40]">
            {/* Progress Indicators */}
            <div className="mb-6 flex items-center justify-between border-b border-[#E7D3D0] pb-4">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step >= 1 ? 'bg-[#F35E3E] text-[#FCEFED] shadow-md' : 'bg-white text-[#3B2E40]/50 border border-[#E7D3D0]'
                }`}>
                  1
                </span>
                <span className="text-xs font-bold text-[#3B2E40]">Applicant Info</span>
              </div>
              <div className="h-0.5 w-8 bg-[#E7D3D0]" />
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step >= 2 ? 'bg-[#F35E3E] text-[#FCEFED] shadow-md' : 'bg-white text-[#3B2E40]/50 border border-[#E7D3D0]'
                }`}>
                  2
                </span>
                <span className="text-xs font-bold text-[#3B2E40]">MD Approval</span>
              </div>
              <div className="h-0.5 w-8 bg-[#E7D3D0]" />
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step === 3 ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-[#3B2E40]/50 border border-[#E7D3D0]'
                }`}>
                  3
                </span>
                <span className="text-xs font-bold text-[#3B2E40]">Ready</span>
              </div>
            </div>

            {/* Mandatory MD Approval Notice Banner */}
            {step === 1 && (
              <div className="mb-6 rounded-2xl border border-[#6173F4]/30 bg-[#6173F4]/10 p-4 text-xs text-[#3B2E40] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#6173F4]">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span>Mandatory Managing Director Authorization</span>
                </div>
                <p className="leading-relaxed text-[#3B2E40]/80">
                  Administrator registration requires approval from the Managing Director. The verification OTP is sent only to the authorized MD email address.
                </p>
                <div className="flex items-center gap-1.5 pt-0.5 text-[11px] font-semibold text-[#6173F4]">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Approval Recipient: <span className="font-mono text-[#3B2E40]">{policyStatus.targetEmail}</span></span>
                </div>
              </div>
            )}

            {serverError && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-50 p-4 text-sm text-rose-900">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-rose-600" />
                <p className="leading-relaxed">{serverError}</p>
              </div>
            )}

            {serverSuccess && step === 2 && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                <p className="leading-relaxed">{serverSuccess}</p>
              </div>
            )}

            {/* STEP 1: Applicant Details */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                    Username
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6173F4]">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      autoCapitalize="none"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="e.g. bhushankamble"
                      className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition focus:ring-4 ${
                        errors.username
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-[#E7D3D0] focus:border-[#6173F4] focus:ring-[#6173F4]/20'
                      }`}
                    />
                  </div>
                  {errors.username && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.username}</p>
                  )}
                </div>

                {/* MSRTC ID */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                    MSRTC ID
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6173F4]">
                      <Shield className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      name="msrtcId"
                      autoComplete="off"
                      value={formData.msrtcId}
                      onChange={handleChange}
                      placeholder="e.g. MSRTC-SAN-01"
                      className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition uppercase focus:ring-4 ${
                        errors.msrtcId
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-[#E7D3D0] focus:border-[#6173F4] focus:ring-[#6173F4]/20'
                      }`}
                    />
                  </div>
                  {errors.msrtcId && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.msrtcId}</p>
                  )}
                </div>

                {/* Personal / Contact Email */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                      Personal / Contact Email
                    </label>
                    <span className="text-[11px] text-[#3B2E40]/60">For profile contact only</span>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6173F4]">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. applicant@msrtc.gov.in"
                      className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition focus:ring-4 ${
                        errors.email
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-[#E7D3D0] focus:border-[#6173F4] focus:ring-[#6173F4]/20'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.email}</p>
                  )}
                  <p className="mt-1 text-[11px] text-[#3B2E40]/65">
                    Your contact email will be stored in your administrator profile. Approval OTP will be sent directly to the Managing Director.
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                    Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6173F4]">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-12 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition focus:ring-4 ${
                        errors.password
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-[#E7D3D0] focus:border-[#6173F4] focus:ring-[#6173F4]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#6173F4] transition hover:text-[#3B2E40]"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6173F4]">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-12 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition focus:ring-4 ${
                        errors.confirmPassword
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-[#E7D3D0] focus:border-[#6173F4] focus:ring-[#6173F4]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#6173F4] transition hover:text-[#3B2E40]"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-rose-600 font-semibold">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#F35E3E] px-6 py-4 text-sm font-bold tracking-wide text-[#FCEFED] shadow-lg transition-all hover:bg-[#E04D2E] focus:outline-none focus:ring-4 focus:ring-[#F35E3E]/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Transmitting Approval Request to MD...</span>
                    </>
                  ) : (
                    <>
                      <span>Request Managing Director Approval OTP</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: MD Approval OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6173F4]/15 text-[#6173F4]">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#3B2E40]">Managing Director Approval Code</h3>
                  <p className="mt-2 text-xs text-[#3B2E40]/75 leading-relaxed">
                    An administrator registration approval OTP has been sent to the designated MD email address (<span className="font-mono font-bold text-[#3B2E40]">{policyStatus.targetEmail}</span>). Registration requires MD authorization.
                  </p>
                  <p className="mt-1.5 text-xs text-[#6173F4] font-medium">
                    Please obtain the 6-digit approval code from the Managing Director to complete registration for <span className="font-bold text-[#3B2E40]">{formData.username}</span> ({formData.msrtcId.toUpperCase()}).
                  </p>
                </div>

                {/* OTP Input */}
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setOtp(val)
                        if (errors.otp) setErrors({})
                        if (serverError) setServerError(null)
                      }}
                      placeholder="000000"
                      className="w-full tracking-[0.5em] text-center font-mono text-2xl font-bold rounded-2xl border border-[#E7D3D0] bg-white py-4 text-[#3B2E40] placeholder-[#3B2E40]/30 outline-none transition focus:border-[#6173F4] focus:ring-4 focus:ring-[#6173F4]/20"
                    />
                  </div>
                  {errors.otp && (
                    <p className="mt-2 text-center text-xs text-rose-600 font-semibold">{errors.otp}</p>
                  )}
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#6173F4] font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Approval code valid for 5 minutes</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#F35E3E] px-6 py-4 text-sm font-bold tracking-wide text-[#FCEFED] shadow-lg transition-all hover:bg-[#E04D2E] focus:outline-none focus:ring-4 focus:ring-[#F35E3E]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Verifying MD Approval Code...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Verify & Create Administrator Account</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1)
                        setServerError(null)
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B2E40]/70 transition hover:text-[#3B2E40]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Edit Details
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || loading}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6173F4] transition hover:text-[#F35E3E] disabled:cursor-not-allowed disabled:text-[#3B2E40]/40"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                      {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend MD Approval Code'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: Registration Complete */}
            {step === 3 && (
              <div className="py-4 text-center space-y-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50 shadow-xl">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <div>
                  <h3 className="text-2xl font-black text-[#3B2E40]">Registration Complete!</h3>
                  <p className="mt-2 text-sm text-[#3B2E40]/75 max-w-sm mx-auto leading-relaxed">
                    Administrator registration has been authorized by the Managing Director. Account <span className="font-bold text-[#3B2E40]">{formData.username}</span> ({formData.msrtcId.toUpperCase()}) is active.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E7D3D0] bg-white p-4 text-xs text-[#3B2E40] text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#3B2E40]/70">Username:</span>
                    <span className="font-bold text-[#3B2E40]">{formData.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3B2E40]/70">MSRTC ID:</span>
                    <span className="font-bold text-[#3B2E40]">{formData.msrtcId.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3B2E40]/70">Contact Email:</span>
                    <span className="font-bold text-[#3B2E40]">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3B2E40]/70">Clearance:</span>
                    <span className="font-bold text-[#6173F4]">Depot Administrator</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3B2E40]/70">Status:</span>
                    <span className="font-bold text-emerald-700">MD Authorized & Active</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/login', { replace: true })}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#F35E3E] px-6 py-4 text-sm font-bold tracking-wide text-[#FCEFED] shadow-lg transition-all hover:bg-[#E04D2E] focus:outline-none focus:ring-4 focus:ring-[#F35E3E]/30"
                >
                  <span>Proceed to Admin Login</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}

            {/* Footer Navigation Link */}
            {step !== 3 && (
              <div className="mt-8 border-t border-[#E7D3D0] pt-6 text-center">
                <p className="text-sm text-[#3B2E40]/70">
                  Already registered?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-[#6173F4] transition hover:text-[#F35E3E] hover:underline"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
