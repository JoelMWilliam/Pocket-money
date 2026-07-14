import { useState } from 'react'
import { Upload, FileSpreadsheet, X, Check, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { parseCSV, isValidDate, detectType, findOrCreateCategory, importCSVRows } from '../lib/importCSV'

export default function ImportCSV() {
  const { accounts } = useAppStore()
  const [rows, setRows] = useState([])
  const [preview, setPreview] = useState([])
  const [importAccountId, setImportAccountId] = useState(accounts[0]?.id || '')
  const [mapping, setMapping] = useState({
    date: 'date',
    amount: 'amount',
    note: 'note',
    category: 'category',
    type: 'type'
  })
  const [imported, setImported] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [quality, setQuality] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const allRows = parseCSV(event.target.result)
      setRows(allRows)
      setPreview(allRows.slice(0, 10))
      analyzeQuality(allRows)
    }
    reader.readAsText(file)
  }

  const analyzeQuality = (allRows) => {
    let valid = 0
    let invalidDate = 0
    let zeroAmount = 0
    let missingCategory = 0
    let missingNote = 0

    allRows.forEach((row) => {
      const type = detectType(row, mapping)
      const amount = Math.abs(Number(row[mapping.amount].replace(/[^0-9.-]/g, '')))
      const dateValid = isValidDate(row[mapping.date])
      const category = findOrCreateCategory(row[mapping.category], type, useAppStore.getState().categories)
      const note = (row[mapping.note] || row[mapping.category] || '').trim()

      if (!dateValid) invalidDate++
      if (!amount) zeroAmount++
      if (!category) missingCategory++
      if (!note) missingNote++

      if (dateValid && amount && category) valid++
    })

    const total = allRows.length || 1
    const score = Math.round((valid / total) * 100)
    setQuality({ score, valid, invalidDate, zeroAmount, missingCategory, missingNote, total: allRows.length })
  }

  const findAccount = () => importAccountId || accounts[0]?.id || ''

  const handleImport = () => {
    const { count, skip } = importCSVRows(rows, mapping, importAccountId)
    setImported(count)
    setSkipped(skip)
    setRows([])
    setPreview([])
    setQuality(null)
  }

  const clearFile = () => {
    setRows([])
    setPreview([])
    setQuality(null)
    setImported(0)
    setSkipped(0)
    setImportAccountId(accounts[0]?.id || '')
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm text-on-surface-variant">From other apps</p>
        <h1 className="text-2xl font-bold text-on-surface">Import CSV</h1>
      </header>

      {imported > 0 && (
        <div className="mb-5 rounded-2xl bg-primary-container p-4">
          <div className="flex items-center gap-2 text-primary">
            <Check size={20} />
            <p className="text-sm font-semibold">Imported {imported} transactions{skipped > 0 ? ` · skipped ${skipped}` : ''}</p>
          </div>
        </div>
      )}

      <section className="mb-5 rounded-2xl bg-surface p-4 border border-outline-variant">
        {rows.length === 0 ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface py-8">
            <Upload size={32} className="text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium text-on-surface">Tap to upload CSV</p>
              <p className="text-xs text-on-surface-variant">Wallet by BudgetBakers format</p>
            </div>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-on-surface">{rows.length} rows loaded</p>
              <button onClick={clearFile} className="text-xs text-error">Clear</button>
            </div>
          </div>
        )}
      </section>

      {quality && (
        <section className="mb-5 rounded-2xl bg-surface p-4 border border-outline-variant">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {quality.score >= 80 ? <CheckCircle2 size={18} className="text-green-400" /> : <AlertTriangle size={18} className="text-amber-400" />}
              <span className="text-sm font-semibold text-on-surface">Data Quality: {quality.score}%</span>
            </div>
            <span className="text-xs text-on-surface-variant">{quality.valid} of {quality.total} ready</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {quality.invalidDate > 0 && (
              <div className="flex items-center gap-1 text-error">
                <XCircle size={12} /> {quality.invalidDate} invalid dates
              </div>
            )}
            {quality.zeroAmount > 0 && (
              <div className="flex items-center gap-1 text-error">
                <XCircle size={12} /> {quality.zeroAmount} zero amounts
              </div>
            )}
            {quality.missingCategory > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <AlertTriangle size={12} /> {quality.missingCategory} new categories
              </div>
            )}
            {quality.missingNote > 0 && (
              <div className="flex items-center gap-1 text-on-surface-variant">
                <AlertTriangle size={12} /> {quality.missingNote} missing notes
              </div>
            )}
          </div>
        </section>
      )}

      {preview.length > 0 && (
        <section className="mb-24">
          <h2 className="mb-3 text-lg font-semibold text-on-surface">Preview</h2>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-on-surface-variant">Import into account</label>
            <select
              value={importAccountId}
              onChange={(e) => setImportAccountId(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface"
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            {preview.map((row, idx) => (
              <div key={idx} className="rounded-xl bg-surface p-3 border border-outline-variant">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">{row[mapping.date]}</span>
                  <span className={`text-sm font-semibold ${detectType(row, mapping) === 'income' ? 'text-primary' : 'text-on-surface'}`}>
                    {detectType(row, mapping) === 'income' ? '+' : '-'}{row[mapping.amount]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-on-surface truncate">{row[mapping.note] || row[mapping.category]}</p>
              </div>
            ))}
          </div>
          <button
            onClick={handleImport}
            disabled={!importAccountId}
            className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-on-primary disabled:opacity-40"
          >
            Import {rows.length} Transactions
          </button>
        </section>
      )}

      <section className="mb-24 rounded-2xl bg-surface p-4 border border-outline-variant">
        <div className="mb-3 flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-on-surface">Expected Format</h2>
        </div>
        <p className="text-xs text-on-surface-variant">
          CSV with columns: date, amount, note, category, type. Amount should be positive for income, negative for expense. Invalid rows will be skipped automatically.
        </p>
      </section>
    </div>
  )
}
