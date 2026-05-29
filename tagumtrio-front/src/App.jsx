import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DialogProvider } from './context/dialog-context'
import QRProvider from './context/qr-provider'
import LeadmanLayout from './components/layout/LeadmanLayout'
import MainLayout from './components/layout/MainLayout'
import EmployeeLayout from './components/layout/EmployeeLayout'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Landing = lazy(() => import('./pages/Landing'))
const RoleDashboard = lazy(() => import('./pages/RoleDashboard'))
const LeadmanDashboard = lazy(() => import('./pages/leadman/LeadmanDashboard'))
const LeadmanTransfers = lazy(() => import('./pages/leadman/LeadmanTransfers'))
const LeadmanWorkers = lazy(() => import('./pages/leadman/LeadmanWorkers'))
const LeadmanDailyReport = lazy(() => import('./pages/leadman/LeadmanDailyReport'))
const LeadmanHistory = lazy(() => import('./pages/leadman/LeadmanHistory'))
const ProductionDashboard = lazy(() => import('./pages/production/ProductionDashboard'))
const ProductionConsolidatedReports = lazy(() => import('./pages/production/ProductionConsolidatedReports'))
const Commissions = lazy(() => import('./pages/finance/Commissions'))
const FinanceReports = lazy(() => import('./pages/finance/FinanceReports'))
const FinanceConsolidatedReports = lazy(() => import('./pages/finance/FinanceConsolidatedReports'))
const EmployeePayroll = lazy(() => import('./pages/finance/EmployeePayroll'))
const PayrollPeriodView = lazy(() => import('./pages/finance/PayrollPeriodView'))
const FinanceArchive = lazy(() => import('./pages/finance/FinanceArchive'))
const EmployeeDirectory = lazy(() => import('./pages/HR/EmployeeDirectory'))
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'))
const MyAttendance = lazy(() => import('./pages/employee/MyAttendance'))
const MyPayslips = lazy(() => import('./pages/employee/MyPayslips'))
const ViewPayslip = lazy(() => import('./pages/employee/ViewPayslip'))
const Requests = lazy(() => import('./pages/converted/Requests'))

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
            <Route path="leaves" element={<MyAttendance />} />
            <Route path="payslips" element={<MyPayslips />} />
            <Route path="payslips/:id" element={<ViewPayslip />} />
            <Route path="*" element={<Navigate to="/app/portal" replace />} />
          </Route>

          <Route path="/app/*" element={<MainLayout />}>
            <Route index element={<RoleDashboard />} />
            
            <Route path="production" element={<ProductionDashboard />} />
            <Route path="production/consolidated" element={<ProductionConsolidatedReports />} />
            <Route path="payroll" element={<Commissions />} />
            <Route path="payroll/reports" element={<FinanceReports />} />
            <Route path="payroll/consolidated" element={<FinanceConsolidatedReports />} />
            <Route path="payroll/commissions" element={<Commissions />} />
            <Route path="payroll/archive" element={<FinanceArchive />} />
            <Route path="payroll/employee/:employeeId" element={<EmployeePayroll />} />
            <Route path="payroll/employee/:employeeId/period/:periodKey" element={<PayrollPeriodView />} />
            <Route path="employees" element={<EmployeeDirectory />} />
            <Route path="requests" element={<Requests />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>

          <Route path="/app/leadman/*" element={<LeadmanLayout />}>
            <Route index element={<LeadmanDashboard />} />
            <Route path="transfers" element={<LeadmanTransfers />} />
            <Route path="workers" element={<LeadmanWorkers />} />
            <Route path="report" element={<LeadmanDailyReport />} />
            <Route path="history" element={<LeadmanHistory />} />
            <Route path="*" element={<Navigate to="/app/leadman" replace />} />
          </Route>

          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/production" element={<Navigate to="/app/production" replace />} />
          <Route path="/payroll" element={<Navigate to="/app/payroll" replace />} />
          <Route path="/employees" element={<Navigate to="/app/employees" replace />} />
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
