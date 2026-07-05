import express from 'express'
import request from 'supertest'

process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters-long-for-tests-only'
process.env.NODE_ENV = 'test'

let app

beforeAll(async () => {
  const serverModule = await import('../server.js')
  app = serverModule.default || express()
})

describe('Backend security and functionality', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health')
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('should reject invalid registration input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'short' })
    expect(res.statusCode).toBe(400)
  })

  it('should register and login a valid user', async () => {
    const uniqueUser = `user${Date.now()}`
    const register = await request(app)
      .post('/api/auth/register')
      .send({ username: uniqueUser, password: 'securepass123' })
    expect(register.statusCode).toBe(200)
    expect(register.body.token).toBeDefined()

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: uniqueUser, password: 'securepass123' })
    expect(login.statusCode).toBe(200)
    expect(login.body.token).toBeDefined()
  })

  it('should reject sync without token', async () => {
    const res = await request(app).get('/api/sync')
    expect(res.statusCode).toBe(401)
  })

  it('should accept valid sync data with token', async () => {
    const uniqueUser = `syncuser${Date.now()}`
    const login = await request(app)
      .post('/api/auth/register')
      .send({ username: uniqueUser, password: 'securepass123' })
    const token = login.body.token

    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: { accounts: [] }, version: 1, deviceId: 'test' })
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
