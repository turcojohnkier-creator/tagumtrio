import { useState } from 'react'
import { useAppData } from '../../../context/app-data-context'
import { useAuth } from '../../../context/auth-context'
import { DEPARTMENTS } from '../../../constants/departments'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

export default function RateManagement() {
  const { rates = [], createRate, updateRate, removeRate } = useAppData()
  const { t } = useAuth()
  const [department, setDepartment] = useState(DEPARTMENTS[0] || '')
  const [product, setProduct] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editDepartment, setEditDepartment] = useState('')
  const [editProduct, setEditProduct] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!department || !product || pricePerUnit === '') return
    setSubmitting(true)
    try {
      await createRate({ department, product, pricePerUnit: Number(pricePerUnit) })
      setProduct('')
      setPricePerUnit('')
    } catch (err) {
      console.error(err)
      alert(t('gm.rate.fail_add'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(rate) {
    if (!window.confirm(`${t('gm.rate.confirm_remove_prefix')} ${rate.department} • ${rate.product}?`)) return
    try {
      await removeRate(rate.id)
    } catch (err) {
      console.error(err)
      alert(t('gm.rate.fail_remove'))
    }
  }

  const grouped = rates.reduce((accumulator, rate) => {
    const key = rate.department || 'Unassigned'
    if (!accumulator[key]) accumulator[key] = []
    accumulator[key].push(rate)
    return accumulator
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader title={t('gm.rate.title')} description={t('gm.rate.desc')} />

      <form onSubmit={handleCreate} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">{t('gm.rate.add_label')}</p>
          <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{t('gm.rate.new')}</h3>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 focus:border-emerald-500 focus:outline-none">
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder={t('gm.rate.product_placeholder')} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none" />
          <input value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} type="number" step="0.01" min="0" placeholder={t('gm.rate.price_placeholder')} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none" />
        </div>
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <Button type="submit" disabled={submitting}>{submitting ? t('gm.rate.adding') : t('gm.rate.add_btn')}</Button>
        </div>
      </form>

      <Card>
        <h3 className="font-heading text-lg font-bold text-zinc-900 mb-4">{t('gm.rate.by_dept')}</h3>
        {rates.length === 0 ? (
          <EmptyState title={t('gm.rate.none')} />
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dept, deptRates]) => (
              <div key={dept}>
                <h4 className="mb-2 text-sm font-semibold text-zinc-700">{dept}</h4>
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-emerald-50/70 text-emerald-800">
                      <tr>
                        <th className="px-4 py-2 font-medium">{t('gm.rate.col_product')}</th>
                        <th className="px-4 py-2 font-medium">{t('gm.rate.col_price')}</th>
                        <th className="px-4 py-2 font-medium text-right">{t('gm.rate.col_actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {deptRates.map((rate) => (
                        editingId === rate.id ? (
                          <tr key={rate.id}>
                            <td className="px-4 py-2" colSpan={3}>
                              <form
                                onSubmit={async (event) => {
                                  event.preventDefault()
                                  setEditSubmitting(true)
                                  try {
                                    await updateRate(rate.id, { department: editDepartment, product: editProduct, pricePerUnit: Number(editPrice) })
                                    setEditingId(null)
                                  } catch (err) {
                                    console.error(err)
                                    alert(t('gm.rate.fail_save'))
                                  } finally {
                                    setEditSubmitting(false)
                                  }
                                }}
                                className="flex flex-wrap items-center gap-3"
                              >
                                <select value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none">
                                  {DEPARTMENTS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                                <input value={editProduct} onChange={(e) => setEditProduct(e.target.value)} className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none" />
                                <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" step="0.01" min="0" className="w-32 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none" />
                                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)}>{t('gm.rate.cancel')}</Button>
                                <Button type="submit" size="sm" disabled={editSubmitting}>{editSubmitting ? t('gm.rate.saving') : t('gm.rate.save')}</Button>
                              </form>
                            </td>
                          </tr>
                        ) : (
                          <tr key={rate.id} className="text-zinc-700">
                            <td className="px-4 py-2">{rate.product}</td>
                            <td className="px-4 py-2 font-medium text-emerald-700">₱{Number(rate.pricePerUnit || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(rate.id)
                                  setEditDepartment(rate.department)
                                  setEditProduct(rate.product)
                                  setEditPrice(String(rate.pricePerUnit ?? ''))
                                }}
                                className="mr-3 text-xs font-medium text-zinc-700 hover:text-zinc-900"
                              >
                                {t('gm.rate.edit')}
                              </button>
                              <button type="button" onClick={() => handleDelete(rate)} className="text-xs font-medium text-rose-700 hover:text-rose-800">
                                {t('gm.rate.delete')}
                              </button>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
