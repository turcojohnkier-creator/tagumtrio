import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Lock, UserCircle2 } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import { DEPARTMENTS } from '../constants/departments'
import { useDialog } from '../context/dialog-context'

const ROLE_OPTIONS = [
  { key: 'employee', label: 'Employee' },
  { key: 'leadman', label: 'Leadman' },
  { key: 'production_incharge', label: 'Production In-Charge' },
  { key: 'finance', label: 'Finance' },
  { key: 'hr', label: 'HR / Admin' },
]

export default function Register() {
  const { registerUser } = useAuth()
  const navigate = useNavigate()
  const dialog = useDialog()

  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState('employee')
  const [leadmanDepartments, setLeadmanDepartments] = useState([DEPARTMENTS[0]])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const validationMessage = useMemo(() => {
    if (!name.trim()) return 'Enter your full name.'
    if (!identifier.trim()) return 'Enter your email or employee ID.'
    if (identifier.trim().length < 3) return 'Identifier is too short.'
    if (role === 'leadman' && leadmanDepartments.length === 0) return 'Select at least one leadman department.'
    if (!password) return 'Enter your password.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    if (password.length > 72) return 'Password cannot exceed 72 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    if (!agree) return 'You must agree to the account policy.'
    return ''
  }, [agree, confirmPassword, identifier, leadmanDepartments.length, name, password, role])

  function toggleDepartment(department) {
    setLeadmanDepartments((current) => {
      const exists = current.includes(department)
      if (exists) {
        if (current.length === 1) return current
        return current.filter((value) => value !== department)
      }
      return [...current, department]
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setSubmitting(true)
    Promise.resolve(registerUser({
      name: name.trim(),
      identifier: identifier.trim(),
      password,
      role,
      departments: role === 'leadman' ? leadmanDepartments : undefined,
    })).then((result) => {
      if (!result.ok) {
        setFormError(result.error || 'Unable to register account.')
        setSubmitting(false)
        return
      }

      dialog.success({
        title: 'Account created',
        message: 'Your account was created successfully. You can now sign in.',
      })

      window.setTimeout(() => navigate('/login'), 1200)
    }).catch((error) => {
      setFormError(error.message || 'Unable to register account.')
      dialog.error({
        title: 'Registration failed',
        message: error.message || 'Unable to register account.',
      })
      setSubmitting(false)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030712] via-[#061225] to-[#0b1324] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8 md:p-10">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">TriOPS</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Create account</h1>
          <p className="mt-2 text-sm text-slate-400">Register your account profile. Leadman accounts can be assigned to one or more departments.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm text-slate-300">Full name</label>
              <div className="mt-1.5 relative">
                <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Juan Dela Cruz"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300">Email or Employee ID</label>
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="e.g. juan@triops.local"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Role</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {ROLE_OPTIONS.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </div>

            {role === 'leadman' && (
              <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <label className="text-sm font-medium text-white">Leadman departments</label>
                <p className="mt-1 text-xs text-slate-400">Select one or more departments this leadman account will handle.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                  {DEPARTMENTS.map((item) => (
                    <label key={item} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={leadmanDepartments.includes(item)}
                        onChange={() => toggleDepartment(item)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-slate-300">Password</label>
              <div className="mt-1.5 relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300">Confirm password</label>
              <div className="mt-1.5 relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="Re-enter password"
                />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={agree}
              onChange={(event) => setAgree(event.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
            />
            <span>I confirm that the registration details are correct and agree to account usage policy.</span>
          </label>

          {(formError || validationMessage) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{formError || validationMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || Boolean(validationMessage)}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-emerald-300 hover:text-emerald-200">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}