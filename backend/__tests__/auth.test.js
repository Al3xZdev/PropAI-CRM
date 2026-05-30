const { getAdmin, getRequest } = require('./setup')

describe('Auth — POST /api/auth/login', () => {
  it('devuelve 200 con credenciales válidas', async () => {
    const res = await getRequest()
      .post('/api/auth/login')
      .send({ email: 'test-admin@demo.com', password: 'Test123456' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.user).toHaveProperty('id')
    expect(res.body.user).toHaveProperty('email', 'test-admin@demo.com')
    expect(res.body.user).toHaveProperty('role', 'admin')
    expect(res.body.user.tenant).toHaveProperty('slug', 'demo')
    // Verificar que hay cookies httpOnly
    expect(res.headers['set-cookie']).toBeDefined()
    expect(res.headers['set-cookie'].length).toBeGreaterThanOrEqual(2)
  })

  it('devuelve 401 con contraseña incorrecta', async () => {
    const res = await getRequest()
      .post('/api/auth/login')
      .send({ email: 'test-admin@demo.com', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBeDefined()
  })

  it('devuelve 401 con email inexistente', async () => {
    const res = await getRequest()
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.com', password: 'Test123456' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Credenciales inválidas')
  })

  it('devuelve 400 si falta email o password', async () => {
    const res = await getRequest()
      .post('/api/auth/login')
      .send({ email: 'test-admin@demo.com' })

    expect(res.status).toBe(400)
  })
})

describe('Auth — GET /api/auth/me', () => {
  it('devuelve 401 sin cookie de auth', async () => {
    const res = await getRequest().get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('devuelve 200 con cookie válida (admin agent)', async () => {
    const res = await getAdmin().get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('test-admin@demo.com')
    expect(res.body.user.tenant.slug).toBe('demo')
  })
})

describe('Auth — POST /api/auth/logout', () => {
  it('cierra sesión exitosamente', async () => {
    const res = await getAdmin().post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Después de logout, el mismo agente debería recibir 401
    const meRes = await getAdmin().get('/api/auth/me')
    expect(meRes.status).toBe(401)
  })
})

describe('Auth — Rutas protegidas', () => {
  it('devuelve 401 en /api/properties sin auth', async () => {
    const res = await getRequest().get('/api/properties')
    expect(res.status).toBe(401)
  })

  it('devuelve 401 en /api/leads sin auth', async () => {
    const res = await getRequest().get('/api/leads')
    expect(res.status).toBe(401)
  })
})
