const { getAdmin, getAgent, getRequest } = require('./setup')

describe('Properties — CRUD', () => {
  let testPropertyId = null
  let secondPropertyId = null

  it('POST /api/properties — crear propiedad', async () => {
    const res = await getAdmin()
      .post('/api/properties')
      .send({
        title: '[TEST] Casa en Palermo',
        address: 'Av. Libertador 1234, Palermo',
        price: 250000,
        area: 180,
        bedrooms: 3,
        bathrooms: 2,
        propertyType: 'casa',
        description: 'Hermosa casa en Palermo con pileta',
        features: ['pileta', 'parrilla', 'cochera']
      })

    expect(res.status).toBe(201)
    expect(res.body.property).toHaveProperty('id')
    expect(res.body.property.title).toContain('[TEST]')
    expect(res.body.property.propertyType).toBe('casa')

    testPropertyId = res.body.property.id
  })

  it('POST /api/properties — agente también puede crear', async () => {
    const res = await getAgent()
      .post('/api/properties')
      .send({
        title: '[TEST] Propiedad de agente',
        address: 'Calle Falsa 123, Belgrano',
        price: 180000,
        area: 120,
        bedrooms: 2,
        bathrooms: 1,
        propertyType: 'departamento'
      })

    expect(res.status).toBe(201)
    expect(res.body.property).toHaveProperty('id')

    secondPropertyId = res.body.property.id
  })

  it('GET /api/properties — listar propiedades', async () => {
    const res = await getAdmin().get('/api/properties')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.properties)).toBe(true)
    // La propiedad recién creada debería estar en la lista
    const found = res.body.properties.find(p => p.id === testPropertyId)
    expect(found).toBeDefined()
  })

  it('GET /api/properties/:id — detalle de propiedad', async () => {
    expect(testPropertyId).not.toBeNull()

    const res = await getAdmin().get(`/api/properties/${testPropertyId}`)

    expect(res.status).toBe(200)
    expect(res.body.property.id).toBe(testPropertyId)
    expect(res.body.property.title).toContain('[TEST]')
  })

  it('PUT /api/properties/:id — actualizar propiedad', async () => {
    expect(testPropertyId).not.toBeNull()

    const res = await getAdmin()
      .put(`/api/properties/${testPropertyId}`)
      .send({ title: '[TEST] Casa en Palermo (Actualizada)', price: '275000' })

    expect(res.status).toBe(200)
    expect(res.body.property.title).toContain('Actualizada')
  })

  it('DELETE /api/properties/:id — agente puede eliminar', async () => {
    expect(secondPropertyId).not.toBeNull()

    const res = await getAgent().delete(`/api/properties/${secondPropertyId}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('DELETE /api/properties/:id — admin elimina la principal', async () => {
    expect(testPropertyId).not.toBeNull()

    const res = await getAdmin().delete(`/api/properties/${testPropertyId}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('DELETE /api/properties/:id — 404 si ya fue eliminada', async () => {
    expect(testPropertyId).not.toBeNull()

    const res = await getAdmin().delete(`/api/properties/${testPropertyId}`)

    expect(res.status).toBe(404)
  })
})
