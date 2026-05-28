import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DialogProvider } from './context/dialog-context'
import QRProvider from './context/qr-provider'
import LeadmanDashboard from './pages/leadman/LeadmanDashboard'
import LeadmanLayout from './components/layout/LeadmanLayout'
import LeadmanTransfers from './pages/leadman/LeadmanTransfers'
import LeadmanWorkers from './pages/leadman/LeadmanWorkers'
import LeadmanDailyReport from './pages/leadman/LeadmanDailyReport'
import LeadmanHistory from './pages/leadman/LeadmanHistory'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import RoleDashboard from './pages/RoleDashboard'
import ProductionDashboard from './pages/production/ProductionDashboard'
import ProductionConsolidatedReports from './pages/production/ProductionConsolidatedReports'
import Commissions from './pages/finance/Commissions'
import FinanceReports from './pages/finance/FinanceReports'
import FinanceConsolidatedReports from './pages/finance/FinanceConsolidatedReports'
import EmployeePayroll from './pages/finance/EmployeePayroll'
import PayrollPeriodView from './pages/finance/PayrollPeriodView'
import FinanceArchive from './pages/finance/FinanceArchive'
import EmployeeDirectory from './pages/HR/EmployeeDirectory'
import EmployeeLayout from './components/layout/EmployeeLayout'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import MyAttendance from './pages/employee/MyAttendance'
import MyPayslips from './pages/employee/MyPayslips'
import ViewPayslip from './pages/employee/ViewPayslip'
import Requests from './pages/converted/Requests'

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <QRProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </QRProvider>
      </DialogProvider>
    </AuthProvider>
  )
}
