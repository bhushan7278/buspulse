import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Shield, User, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Bus } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    msrtcId: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = location.state?.from?.pathname || '/'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
    if (serverError) {
      setServerError(null)
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required.'
    }
    if (!formData.msrtcId.trim()) {
      newErrors.msrtcId = 'MSRTC ID is required.'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError(null)

    try {
      const response = await api.post('/auth/admin/login', {
        username: formData.username.trim(),
        msrtcId: formData.msrtcId.trim(),
        password: formData.password
      })

      if (response.data?.token && response.data?.admin) {
        login(response.data.token, response.data.admin)
        navigate(redirectPath, { replace: true })
      } else {
        setServerError('Unexpected response format from authentication service.')
      }
    } catch (err) {
      console.error('Login error:', err)
      const errorMsg = err.response?.data?.message ||
        (err.code === 'ERR_NETWORK'
          ? 'Backend server is unavailable. Please ensure the BusPulse server is running.'
          : 'Failed to sign in. Please check your credentials and try again.')
      setServerError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-[85vh] w-full flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2A202E] text-[#6173F4] ring-1 ring-[#6173F4]/50 shadow-lg">
            <Bus className="h-8 w-8" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#6173F4]">BusPulse Operations</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#FCEFED] sm:text-4xl">Admin Login</h1>
          <p className="mt-2 text-sm text-[#FCEFED]/70">Authenticate with your administrator credentials to access the transport dispatch portal.</p>
        </div>

        {/* Card Form: Shell Light Surface */}
        <div className="overflow-hidden rounded-[2.5rem] border border-[#E7D3D0] bg-[#FCEFED] p-8 shadow-2xl sm:p-10 text-[#3B2E40]">
          {serverError && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-50 p-4 text-sm text-rose-900">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <p className="leading-relaxed">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
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
                  placeholder="e.g. admin"
                  className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition focus:ring-4 ${
                    errors.username
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-[#E7D3D0] focus:border-[#6173F4] focus:ring-[#6173F4]/20'
                  }`}
                />
              </div>
              {errors.username && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">{errors.username}</p>
              )}
            </div>

            {/* MSRTC ID */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
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
                  placeholder="e.g. MSRTC-101"
                  className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-sm text-[#3B2E40] placeholder-[#3B2E40]/45 outline-none transition uppercase focus:ring-4 ${
                    errors.msrtcId
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-[#E7D3D0] focus:border-[#6173F4] focus:ring-[#6173F4]/20'
                  }`}
                />
              </div>
              {errors.msrtcId && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">{errors.msrtcId}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#3B2E40]/80">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#6173F4]">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
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
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">{errors.password}</p>
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
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 border-t border-[#E7D3D0] pt-6 text-center">
            <p className="text-sm text-[#3B2E40]/70">
              New administrator?{' '}
              <Link
                to="/register"
                className="font-bold text-[#6173F4] transition hover:text-[#F35E3E] hover:underline"
              >
                Register with Email OTP
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
