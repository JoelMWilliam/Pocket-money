import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import syncRoutes from './routes/sync.js'
import authMiddleware from './middleware/auth.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const NODE_ENV = process.env.NODE_ENV || 'development'

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// CORS - restrict in production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || NODE_ENV === 'development') return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))

// HTTPS redirect in production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`)
    }
    next()
  })
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
})

app.use('/api/', apiLimiter)
app.use('/api/auth/', authLimiter)

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/sync', authMiddleware, syncRoutes)

// Global error handler
app.use((err, req, res, next) => {
  console.error(err)
  const status = err.status || 500
  const message = NODE_ENV === 'production' ? 'Internal server error' : err.message
  res.status(status).json({ error: message })
})

app.listen(PORT, '0.0.0.0', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`Pocket Money backend running on http://localhost:${PORT}`)
  }
})

export default app
