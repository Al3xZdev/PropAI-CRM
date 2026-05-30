const { getAdmin, getRequest } = require('./setup')

describe('Contracts', () => {
  let testPropertyId = null
  let testLeadId = null
  let testContractId = null

  beforeAll(async () => {
    // Crear propiedad de test
    const propRes = await getAdmin()
      .post('/api/properties')
      .send({
        title: '[TEST] Propiedad para contrato',
        address: 'Av. Siempre Viva 742, Springfield',
        price: 300000,
        area: 200,
        bedrooms: 4,
        bathrooms: 3,
        propertyType: 'casa'
      })

    if (propRes.status === 201) {
      testPropertyId = propRes.body.property.id
    }

    // Crear lead de test
    const leadRes = await getAdmin()
      .post('/api/leads')
      .send({
        name: 'Test Contrato Lead',
        email: 'test-contrato@example.com',
        phone: '1199988877',
        status: 'interesado'
      })

    if (leadRes.status === 201) {
      testLeadId = leadRes.body.id
    }
  }, 15000)

  it('POST /api/contracts — generar contrato', async () => {
    expect(testPropertyId).not.toBeNull()
    expect(testLeadId).not.toBeNull()

    const res = await getAdmin()
      .post('/api/contracts/generate')
      .send({
        leadId: testLeadId,
        contractType: 'compraventa',
        formData: {
          buyerName: 'Comprador Test',
          buyerDni: '12345678',
          price: '300000',
          date: new Date().toISOString().split('T')[0]
        }
      })

    expect(res.status).toBe(200)
    expect(res.body.document).toHaveProperty('id')
    expect(res.body.document).toHaveProperty('downloadUrl')

    testContractId = res.body.document.id
  })

  it('GET /api/contracts — listar contratos (como documents)', async () => {
    const res = await getAdmin().get('/api/contracts')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.documents)).toBe(true)
  })

  it('GET /api/contracts/:id/download — sin token devuelve 401', async () => {
    expect(testContractId).not.toBeNull()

    const res = await getRequest()
      .get(`/api/contracts/download/${testContractId}`)

    expect(res.status).toBe(401)
  })

  afterAll(async () => {
    if (testContractId) {
      await getAdmin().delete(`/api/contracts/${testContractId}`).catch(() => {})
    }
    if (testPropertyId) {
      await getAdmin().delete(`/api/properties/${testPropertyId}`).catch(() => {})
    }
    if (testLeadId) {
      await getAdmin().delete(`/api/leads/${testLeadId}`).catch(() => {})
    }
  }, 15000)
})
