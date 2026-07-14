import { useAppStore } from '../store/useAppStore'
import { generateId } from './utils'

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map((line) => {
    const values = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote inside a quoted field.
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || ''
      return obj
    }, {})
  })
}

export function isValidDate(d) {
  return d && !isNaN(new Date(d).getTime())
}

export function detectType(row, mapping) {
  const type = (row[mapping.type] || '').toLowerCase()
  if (type.includes('income') || type.includes('credit')) return 'income'
  if (type.includes('transfer')) return 'transfer'
  const amount = Number(row[mapping.amount])
  if (amount < 0) return 'expense'
  if (amount > 0) return 'income'
  return 'expense'
}

export function findOrCreateCategory(name, type, currentCategories) {
  const clean = (name || '').trim()
  if (!clean) return undefined
  const existing = currentCategories.find(
    (c) => c.name.toLowerCase() === clean.toLowerCase() && c.type === type
  )
  return existing ? existing.id : undefined
}

export function importCSVRows(rows, mapping, importAccountId) {
  let count = 0
  let skip = 0
  const addedCategories = new Map()

  rows.forEach((row) => {
    const type = detectType(row, mapping)
    const rawAmount = row[mapping.amount]
    const amount = Math.abs(Number(rawAmount.replace(/[^0-9.-]/g, '')))
    const dateValue = row[mapping.date]
    const dateValid = isValidDate(dateValue)
    if (!amount || !dateValid) {
      skip++
      return
    }
    const date = new Date(dateValue).toISOString().slice(0, 10)

    const categoryKey = `${(row[mapping.category] || '').trim()}:${type}`
    let categoryId = addedCategories.get(categoryKey)
    if (!categoryId) {
      categoryId = findOrCreateCategory(row[mapping.category], type, useAppStore.getState().categories)
    }
    if (!categoryId) {
      const newCat = {
        name: (row[mapping.category] || 'Imported').trim() || 'Imported',
        type,
        icon: type === 'income' ? 'Banknote' : 'Tag',
        color: '#8E8E93'
      }
      const added = useAppStore.getState().addCategory({ ...newCat, id: generateId() })
      categoryId = added.id
      addedCategories.set(categoryKey, categoryId)
    }

    const accountId = importAccountId || useAppStore.getState().accounts[0]?.id || ''
    useAppStore.getState().addTransaction({
      type,
      amount,
      accountId,
      categoryId,
      date,
      note: row[mapping.note] || row[mapping.category] || 'Imported',
      tags: ['csv-import']
    })
    count++
  })

  return { count, skip }
}
