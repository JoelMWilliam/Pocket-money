import express from 'express'
import { body, validationResult } from 'express-validator'
import { syncDB } from '../db.js'

const router = express.Router()

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg })
  }
  next()
}

router.get('/', (req, res) => {
  const payload = syncDB.get(req.user.username)
  if (!payload) {
    return res.json({ exists: false, payload: null })
  }
  res.json({ exists: true, payload })
})

router.post('/', [
  body('data').isObject().withMessage('Data must be an object'),
  body('version').optional().isInt({ min: 1 }).withMessage('Version must be a positive integer'),
  body('deviceId').optional().trim().isLength({ max: 64 }).escape()
], handleValidationErrors, (req, res) => {
  const { data, version, deviceId } = req.body

  const incomingVersion = Number(version) || Date.now()
  const existing = syncDB.get(req.user.username)

  if (existing && existing.data && existing.version && incomingVersion < existing.version) {
    return res.status(409).json({
      error: 'Conflict: server has newer data',
      payload: existing
    })
  }

  syncDB.set(req.user.username, {
    data,
    version: incomingVersion,
    deviceId: deviceId || 'unknown'
  })

  res.json({ success: true, updatedAt: new Date().toISOString() })
})

router.delete('/', (req, res) => {
  syncDB.set(req.user.username, { data: null, deleted: true, version: Date.now() })
  res.json({ success: true })
})

export default router
