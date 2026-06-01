import React, { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import DepartmentCard from '../../components/gm/DepartmentCard'
import EmployeeListModal from '../../components/gm/EmployeeListModal'
import { DEPARTMENTS } from '../../constants/departments'
import { useQr } from '../../context/qr-context'

export default function GMOverview() {
  const { employees = [], employeesLoading } = useQr()
  const [selectedDept, setSelectedDept] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [sortOption, setSortOption] = useState('most')

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.is_active !== false), [employees])

  const departments = useMemo(() => {
    const counts = {}
    activeEmployees.forEach((employee) => {
      const department = employee.department || 'Unassigned'
      counts[department] = (counts[department] || 0) + 1
    })
    return DEPARTMENTS.map((name) => ({ name, activeCount: counts[name] || 0 }))
  }, [activeEmployees])

  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => {
      if (sortOption === 'most') {
        return b.activeCount - a.activeCount
      }
      return a.activeCount - b.activeCount
    })
  }, [departments, sortOption])

  function openDept(dept) {
    setSelectedDept(dept)
    setShowModal(true)
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Department cards</p>
              <p className="text-sm text-slate-400">Tap a card to open the active employee roster and reassign team members.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm text-slate-300">
                <ChevronRight className="h-4 w-4 text-emerald-400" />
                {departments.length} departments
              </div>
              <div className="inline-flex gap-2 rounded-full border border-slate-800 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setSortOption('most')}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${sortOption === 'most' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  Most staffed
                </button>
                <button
                  type="button"
                  onClick={() => setSortOption('least')}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${sortOption === 'least' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  Least staffed
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {employeesLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-3xl bg-slate-900" />
              ))
            : sortedDepartments.map((d) => (
                <DepartmentCard key={d.name} department={d} onOpen={() => openDept(d)} />
              ))}
        </div>
      </div>

      {showModal && selectedDept && (
        <EmployeeListModal department={selectedDept} onClose={() => setShowModal(false)} employees={employees} />
      )}
    </div>
  )
}
