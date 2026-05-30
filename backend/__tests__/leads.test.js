const { getAdmin } = require('./setup')

describe('Leads — CRUD', () => {
  let testLeadId = null

  it('POST /api/leads — crear lead', async () => {
    const res = await getAdmin()
      .post('/api/leads')
      .send({
        name: 'Test Juan Perez',
        email: 'test-juan@example.com',
        phone: '1122334455',
        status: 'nuevo',
        source: 'test'
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.name).toBe('Test Juan Perez')
    expect(res.body.status).toBe('nuevo')

    testLeadId = res.body.id
  })

  it('GET /api/leads — listar leads', async () => {
    const res = await getAdmin().get('/api/leads')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.leads || res.body)).toBe(true)
  })

  it('GET /api/leads/stats/summary — devuelve estadísticas', async () => {
    const res = await getAdmin().get('/api/leads/stats/summary')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total')
    expect(typeof res.body.total).toBe('number')
  })

  it('PUT /api/leads/:id — actualizar lead', async () => {
    expect(testLeadId).not.toBeNull()

    const res = await getAdmin()
      .put(`/api/leads/${testLeadId}`)
      .send({ status: 'contactado', notes: 'Contactado via test' })

    expect(res.status).toBe(200)
    expect(res.body.lead.status).toBe('contactado')
    expect(res.body.lead.notes).toBe('Contactado via test')
  })

  it('DELETE /api/leads/:id — eliminar lead', async () => {
    expect(testLeadId).not.toBeNull()

    const res = await getAdmin().delete(`/api/leads/${testLeadId}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
