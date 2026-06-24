import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DialogProvider } from './context/dialog-context'
import QRProvider from './context/qr-provider'
import LeadmanLayout from './roles/leadman/layout/LeadmanLayout'
import MainLayout from './shared/layout/MainLayout'
import EmployeeLayout from './roles/employee/layout/EmployeeLayout'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Landing = lazy(() => import('./pages/Landing'))
const RoleDashboard = lazy(() => import('./pages/RoleDashboard'))
const LeadmanDashboard = lazy(() => import('./roles/leadman/pages/LeadmanDashboard'))
const LeadmanIncomingReports = lazy(() => import('./roles/leadman/pages/LeadmanIncomingReports'))
const LeadmanWorkers = lazy(() => import('./roles/leadman/pages/LeadmanWorkers'))
const LeadmanDailyReport = lazy(() => import('./roles/leadman/pages/LeadmanDailyReport'))
const LeadmanHistory = lazy(() => import('./roles/leadman/pages/LeadmanHistory'))
const ProductionDashboard = lazy(() => import('./roles/production/pages/ProductionDashboard'))
const ProductionReports = lazy(() => import('./roles/production/pages/ProductionReports'))
const ProductionCompiledReports = lazy(() => import('./roles/production/pages/ProductionCompiledReports'))
const ProductionConsolidatedReports = lazy(() => import('./roles/production/pages/ProductionConsolidatedReports'))
const FinanceHome = lazy(() => import('./roles/finance/pages/FinanceHome'))
const FinanceProductionReports = lazy(() => import('./roles/finance/pages/FinanceProductionReports'))
const FinanceDepartmentEmployees = lazy(() => import('./roles/finance/pages/FinanceDepartmentEmployees'))
// GMOversight removed — GMOverview will be the main GM entry
const HRCreateAccount = lazy(() => import('./roles/hr/pages/HRCreateAccount'))
const HREmployeeDirectory = lazy(() => import('./roles/hr/pages/EmployeeDirectory'))
const GMEmployeeManagement = lazy(() => import('./roles/gm/pages/EmployeeManagement'))
const GMAnnouncements = lazy(() => import('./roles/gm/pages/Announcements'))
const GMOverview = lazy(() => import('./roles/gm/pages/GMOverview'))
const EmployeeDashboard = lazy(() => import('./roles/employee/pages/EmployeeDashboard'))
const EmployeeAnnouncements = lazy(() => import('./roles/employee/pages/Announcements'))
const MyAttendance = lazy(() => import('./roles/employee/pages/MyAttendance'))
const MyPayslips = lazy(() => import('./roles/employee/pages/MyPayslips'))
const ViewPayslip = lazy(() => import('./roles/employee/pages/ViewPayslip'))
const Requests = lazy(() => import('./shared/pages/Requests'))

function RouteLoadingFallback() {
  return <div className="p-6 text-sm text-slate-400">Loading...</div>
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <QRProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Landing />} />

                <Route path="/app/portal/*" element={<EmployeeLayout />}>
                  <Route index element={<EmployeeDashboard />} />
                  <Route path="announcements" element={<EmployeeAnnouncements />} />
                  <Route path="leaves" element={<MyAttendance />} />
                  <Route path="payslips" element={<MyPayslips />} />
                  <Route path="payslips/:id" element={<ViewPayslip />} />
                  <Route path="*" element={<Navigate to="/app/portal" replace />} />
                </Route>

                <Route path="/app/*" element={<MainLayout />}>
                  <Route index element={<RoleDashboard />} />
                  <Route path="dashboard" element={<RoleDashboard />} />

                  <Route path="production" element={<ProductionDashboard />} />
                  <Route path="production/reports" element={<ProductionReports />} />
                  <Route path="production/compiled" element={<ProductionCompiledReports />} />
                  <Route path="production/consolidated" element={<ProductionConsolidatedReports />} />

                  <Route path="payroll" element={<FinanceHome />} />
                  <Route path="payroll/production" element={<FinanceProductionReports />} />
                  <Route path="payroll/employees" element={<FinanceDepartmentEmployees />} />

                  <Route path="hr" element={<Navigate to="/app/hr/employees" replace />} />
                  <Route path="hr/create-account" element={<HRCreateAccount />} />
                  <Route path="hr/employees" element={<HREmployeeDirectory />} />
                  <Route path="gm/employees" element={<GMEmployeeManagement />} />
                  <Route path="gm/announcements" element={<GMAnnouncements />} />
                  <Route path="gm" element={<GMOverview />} />
                  <Route path="gm/overview" element={<GMOverview />} />
                  <Route path="requests" element={<Requests />} />
                  <Route path="*" element={<Navigate to="" replace />} />
                </Route>

                <Route path="/app/leadman/*" element={<LeadmanLayout />}>
                  <Route index element={<LeadmanDashboard />} />
                  <Route path="reports" element={<LeadmanIncomingReports />} />
                  <Route path="workers" element={<LeadmanWorkers />} />
                  <Route path="report" element={<LeadmanDailyReport />} />
                  <Route path="history" element={<LeadmanHistory />} />
                  <Route path="*" element={<Navigate to="/app/leadman" replace />} />
                </Route>

                <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/production" element={<Navigate to="/app/production" replace />} />
                <Route path="/payroll" element={<Navigate to="/app/payroll" replace />} />
                <Route path="/employees" element={<Navigate to="/app/gm/employees" replace />} />
                <Route path="/requests" element={<Navigate to="/app/requests" replace />} />
                <Route path="/portal" element={<Navigate to="/app/portal" replace />} />
                <Route path="/portal/leaves" element={<Navigate to="/app/portal/leaves" replace />} />
                <Route path="/portal/payslips" element={<Navigate to="/app/portal/payslips" replace />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </QRProvider>
      </DialogProvider>
    </AuthProvider>
  )
}