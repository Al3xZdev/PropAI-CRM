// GenerateContractModal - Modal de 3 pasos para generar contratos inmobiliarios
import { useState, useEffect } from 'react'
import { X, FileText, User, Home, DollarSign, Check, ChevronRight, ChevronLeft, Loader2, Download, AlertCircle, File } from 'lucide-react'
import { api } from '../utils/api'

const CONTRACT_TYPES = [
  { value: 'compraventa', label: 'Compraventa', description: 'Contrato de compraventa de propiedad' },
  { value: 'alquiler', label: 'Alquiler', description: 'Contrato de alquiler temporal o permanente' },
  { value: 'reserva', label: 'Reserva', description: 'Contrato de reserva con seña' },
  { value: 'mandato', label: 'Mandato', description: 'Contrato de mandato inmobiliario' }
]

const CIVIL_STATUS = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'divorciado', label: 'Divorciado/a' },
  { value: 'viudo', label: 'Viudo/a' },
  { value: 'concubino', label: 'Concubino/a' }
]

const PAYMENT_METHODS = [
  { value: 'contado', label: 'Contado' },
  { value: 'financiado', label: 'Financiado' },
  { value: 'credito', label: 'Crédito Hipotecario' },
  { value: 'apartado', label: 'Apartado en cuotas' }
]

const CURRENCIES = [
  { value: 'USD', label: 'Dólares (USD)' },
  { value: 'ARS', label: 'Pesos Argentinos (ARS)' }
]

export default function GenerateContractModal({ isOpen, onClose, lead, onContractGenerated }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState(null)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    // Tipo de contrato
    contractType: 'compraventa',
    
    // Comprador / Locatario
    buyer_dni: '',
    buyer_address: '',
    buyer_civil_status: '',
    
    // Vendedor / Locador
    seller_name: '',
    seller_dni: '',
    seller_address: '',
    seller_civil_status: '',
    
    // Propiedad
    property_address: '',
    property_surface: '',
    property_registry: '',
    
    // Operación
    price: '',
    currency: 'USD',
    closing_date: '',
    payment_method: 'contado',
    deposit: '',
    commission_pct: ''
  })

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setGeneratedDoc(null)
      setError(null)
      
      // Pre-fill with lead data
      setFormData(f => ({
        ...f,
        buyer_dni: '',
        buyer_address: '',
        buyer_civil_status: '',
        property_address: lead?.property?.address || '',
        property_surface: lead?.property?.area || ''
      }))
    }
  }, [isOpen, lead])

  const updateField = (field, value) => {
    setFormData(f => ({ ...f, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Paso 1: generar el contrato
      const response = await api.post('/contracts/generate', {
        leadId: lead.id,
        contractType: formData.contractType,
        formData: {
          ...formData,
          price: formData.price ? parseFloat(formData.price) : null,
          deposit: formData.deposit ? parseFloat(formData.deposit) : null,
          commission_pct: formData.commission_pct ? parseFloat(formData.commission_pct) : null
        }
      })
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Error al generar contrato')
      }
      
      const data = await response.json()
      const doc = data.document
      
      setGeneratedDoc(doc)
      setStep(4) // Success step
      
      // Notify parent
      onContractGenerated?.(doc)

      // Paso 2: abrir descarga en nueva pestaña (mismo origin, cookie httpOnly vía proxy)
      window.open(`/api/contracts/download/${doc.id}`, '_blank')
      
    } catch (err) {
      console.error('Error generating contract:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

const downloadContract = async () => {
  console.log('[DOWNLOAD] generatedDoc:', generatedDoc);
  if (!generatedDoc?.id) {
    alert('Error: ID de documento no disponible');
    return;
  }

  try {
    const res = await api.get(`/contracts/download/${generatedDoc.id}`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = generatedDoc.filename || `contrato_${generatedDoc.id}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
} catch (e) {
    alert(`Error al descargar: ${e.message}`);
  }
}

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Generar Contrato</h2>
                <p className="text-slate-400 text-sm">Completa los datos para crear el documento</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                <div className={`h-1 flex-1 rounded ${step > s ? 'bg-blue-600' : 'bg-slate-700'}`} />
              </div>
            ))}
          </div>
          <div className="flex text-xs text-slate-400 mt-2">
            <span className="flex-1 text-center">Tipo</span>
            <span className="flex-1 text-center">Partes</span>
            <span className="flex-1 text-center">Detalles</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Contract Type */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-white mb-4">Selecciona el tipo de contrato</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {CONTRACT_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => updateField('contractType', type.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.contractType === type.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <p className="font-medium text-white">{type.label}</p>
                    <p className="text-slate-400 text-sm mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Parties (Buyer/Seller) */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-white mb-4">Datos de las partes</h3>
              
              {/* Buyer / Tenant */}
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  {formData.contractType === 'alquiler' ? 'Locatario' : 'Comprador'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">DNI / Documento</label>
                    <input
                      type="text"
                      value={formData.buyer_dni}
                      onChange={(e) => updateField('buyer_dni', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="XX.XXX.XXX"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Estado Civil</label>
                    <select
                      value={formData.buyer_civil_status}
                      onChange={(e) => updateField('buyer_civil_status', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      {CIVIL_STATUS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-400 text-xs mb-1">Domicilio</label>
                    <input
                      type="text"
                      value={formData.buyer_address}
                      onChange={(e) => updateField('buyer_address', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="Dirección completa"
                    />
                  </div>
                </div>
              </div>

              {/* Seller / Owner */}
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  {formData.contractType === 'alquiler' ? 'Locador' : 'Vendedor'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-400 text-xs mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.seller_name}
                      onChange={(e) => updateField('seller_name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="Nombre del vendedor"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">DNI / Documento *</label>
                    <input
                      type="text"
                      required
                      value={formData.seller_dni}
                      onChange={(e) => updateField('seller_dni', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="XX.XXX.XXX"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Estado Civil</label>
                    <select
                      value={formData.seller_civil_status}
                      onChange={(e) => updateField('seller_civil_status', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      {CIVIL_STATUS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-400 text-xs mb-1">Domicilio</label>
                    <input
                      type="text"
                      value={formData.seller_address}
                      onChange={(e) => updateField('seller_address', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="Dirección completa"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Property & Transaction Details */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-white mb-4">Detalles de la operación</h3>
              
              {/* Property */}
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4 text-purple-400" />
                  Propiedad
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-400 text-xs mb-1">Dirección *</label>
                    <input
                      type="text"
                      required
                      value={formData.property_address}
                      onChange={(e) => updateField('property_address', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="Dirección de la propiedad"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Superficie (m²)</label>
                    <input
                      type="text"
                      value={formData.property_surface}
                      onChange={(e) => updateField('property_surface', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Matrícula</label>
                    <input
                      type="text"
                      value={formData.property_registry}
                      onChange={(e) => updateField('property_registry', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="N° de matrícula"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Detalles Financieros
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Precio *</label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => updateField('price', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Moneda</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => updateField('currency', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Forma de Pago</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => updateField('payment_method', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                    >
                      {PAYMENT_METHODS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Fecha de Escritura</label>
                    <input
                      type="date"
                      value={formData.closing_date}
                      onChange={(e) => updateField('closing_date', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  {formData.contractType !== 'mandato' && (
                    <>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Seña</label>
                        <input
                          type="number"
                          value={formData.deposit}
                          onChange={(e) => updateField('deposit', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                          placeholder="Monto de seña"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Comisión (%)</label>
                        <input
                          type="number"
                          value={formData.commission_pct}
                          onChange={(e) => updateField('commission_pct', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                          placeholder="3"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && generatedDoc && (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">¡Contrato Generado!</h3>
              <p className="text-slate-400 mb-6">
                El documento <strong className="text-white">{generatedDoc.filename}</strong> ha sido creado exitosamente.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => downloadContract()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  Descargar DOCX
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="p-6 border-t border-slate-700 flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Atrás
              </button>
            )}
            
            <div className="flex-1" />
            
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 rounded-xl text-white font-medium transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generar Contrato
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Footer - Success state */}
        {step === 4 && (
          <div className="p-6 border-t border-slate-700">
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}