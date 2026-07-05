import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const SYNC_FILE = path.join(DATA_DIR, 'sync.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJSON(file, fallback = {}) {
  ensureDataDir()
  if (!fs.existsSync(file)) return fallback
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}

function writeJSON(file, data) {
  ensureDataDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

export const usersDB = {
  getAll: () => readJSON(USERS_FILE, {}),
  get: (username) => readJSON(USERS_FILE, {})[username],
  set: (username, user) => {
    const users = readJSON(USERS_FILE, {})
    users[username] = user
    writeJSON(USERS_FILE, users)
  }
}

export const syncDB = {
  get: (username) => readJSON(SYNC_FILE, {})[username],
  set: (username, payload) => {
    const data = readJSON(SYNC_FILE, {})
    data[username] = {
      ...payload,
      updatedAt: new Date().toISOString()
    }
    writeJSON(SYNC_FILE, data)
  }
}
