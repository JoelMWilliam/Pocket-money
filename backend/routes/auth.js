import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { body, validationResult } from 'express-validator'
import { usersDB } from '../db.js'

const router = express.Router()
let JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn('JWT_SECRET not set or too short. Using random secret for this session only.')
  JWT_SECRET = crypto.randomBytes(48).toString('hex')
  process.env.JWT_SECRET = JWT_SECRET
}

function generateToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' })
}

const usernameValidator = body('username')
  .trim()
  .isLength({ min: 3, max: 32 })
  .withMessage('Username must be 3-32 characters')
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Username can only contain letters, numbers, underscores and hyphens')
  .escape()

const passwordValidator = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be 8-128 characters')

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg })
  }
  next()
}

router.post('/register', usernameValidator, passwordValidator, handleValidationErrors, async (req, res) => {
  const { username, password } = req.body

  const existing = usersDB.get(username)
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  usersDB.set(username, { username, passwordHash, createdAt: new Date().toISOString() })

  const token = generateToken(username)
  res.json({ token, username })
})

router.post('/login', usernameValidator, passwordValidator, handleValidationErrors, async (req, res) => {
  const { username, password } = req.body

  const user = usersDB.get(username)
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = generateToken(username)
  res.json({ token, username })
})

export default router
export { JWT_SECRET }
