import { useMemo, useState } from 'react'
import { AlertCircle, Eye, EyeOff, Lock, UserCircle2 } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { DEPARTMENTS } from '../../../constants/departments'

const ROLE_OPTIONS = [
  { key: 'employee', label: 'Employee' },
  { key: 'leadman', label: 'Leadman' },
  { key: 'production_incharge', label: 'Production In-Charge' },
  { key: 'gm', label: 'GM / General Manager' },
  { key: 'hr', label: 'HR / Admin' },
]

export default function HRCreateAccount() {
  const { user, registerUser } = useAuth()
  const dialog = useDialog()

  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState('employee')
  const [employeeDepartment, setEmployeeDepartment] = useState(DEPARTMENTS[0] || '')
  const [leadmanDepartments, setLeadmanDepartments] = useState([DEPARTMENTS[0]])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agree, setAgree] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  function formatCreatedAt(value) {
    if (!value) return 'Unknown time'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown time'
    return date.toLocaleString()
  }

  function handleEmailBlur() {
    if (identifier.trim() && !identifier.includes('@')) {
      setIdentifier((prev) => prev + '@triops.local')
    }
  }

  const validationMessage = useMemo(() => {
    if (!name.trim()) return 'Enter full name.'
    if (!identifier.trim()) return 'Enter email or employee ID.'
    if (identifier.trim().length < 3) return 'Identifier is too short.'
    if (role === 'employee' && !employeeDepartment) return 'Select a department for the employee.'
    if (role === 'leadman' && leadmanDepartments.length === 0) return 'Select at least one leadman department.'
    if (!password) return 'Enter the account password.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    if (password.length > 72) return 'Password cannot exceed 72 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    if (!agree) return 'Please confirm the account policy.'
    return ''
  }, [agree, confirmPassword, employeeDepartment, identifier, leadmanDepartments.length, name, password, role])

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

  if (user?.role !== 'hr') {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-slate-900">Access denied</h2>
        <p className="mt-2 text-sm text-slate-500">This page is restricted to HR administrators only.</p>
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setSubmitting(true)

    const result = await registerUser({
      name: name.trim(),
      identifier: identifier.trim(),
      password,
      role,
      department: role === 'employee' ? employeeDepartment : undefined,
      departments: role === 'leadman' ? leadmanDepartments : undefined,
    })

    if (!result.ok) {
      setFormError(result.error || 'Unable to create account.')
      setSubmitting(false)
      return
    }

    setName('')
    setIdentifier('')
    setRole('employee')
    setEmployeeDepartment(DEPARTMENTS[0] || '')
    setLeadmanDepartments([DEPARTMENTS[0]])
    setPassword('')
    setConfirmPassword('')
    setAgree(true)
    setSubmitting(false)

    dialog.success({
      title: 'Account created',
      message: `The user account was successfully provisioned at ${formatCreatedAt(result.user?.created_at)}.`,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">HR Account Provisioning</h2>
        <p className="text-slate-500 mt-1">Create user accounts manually for employees, leadman, and production incharge.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Manual user creation</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">Provision a new account</h3>
          <p className="mt-2 text-sm text-slate-500">The account fields match the public registration form, but only HR may create them.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm text-slate-700">Full name</label>
              <div className="mt-1.5 relative">
                <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Juan Dela Cruz"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm text-slate-700">Email</label>
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                onBlur={handleEmailBlur}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                placeholder="e.g. juan@triops.local"
              />
            </div>

            <div>
              <label className="text-sm text-slate-700">Role</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                {ROLE_OPTIONS.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </div>

            {role === 'employee' && (
              <div>
                <label className="text-sm text-slate-700">Department</label>
                <select
                  value={employeeDepartment}
                  onChange={(event) => setEmployeeDepartment(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  {DEPARTMENTS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            )}

            {role === 'leadman' && (
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <label className="text-sm font-medium text-slate-900">Leadman departments</label>
                <p className="mt-1 text-xs text-slate-500">Select one or more departments this leadman account will manage.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                  {DEPARTMENTS.map((item) => (
                    <label key={item} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800">
                      <input
                        type="checkbox"
                        checked={leadmanDepartments.includes(item)}
                        onChange={() => toggleDepartment(item)}
                        className="rounded border-slate-300 bg-white text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-slate-700">Password</label>
              <div className="mt-1.5 relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-700">Confirm password</label>
              <div className="mt-1.5 relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="Re-enter password"
                />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={agree}
              onChange={(event) => setAgree(event.target.checked)}
              className="mt-0.5 rounded border-slate-300 bg-white text-emerald-500 focus:ring-emerald-500"
            />
            <span>I confirm the account details are correct.</span>
          </label>

          {(formError || validationMessage) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{formError || validationMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || Boolean(validationMessage)}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
