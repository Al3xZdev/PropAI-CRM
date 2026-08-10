import { useState, useRef } from 'react'
import { Upload, X, FileText, Loader2, Check, AlertCircle, Download, ChevronDown, ChevronRight } from 'lucide-react'

import { api } from '../utils/api'

// Campos posibles en el CSV
const EXPECTED_FIELDS = [
  { key: 'titulo', label: 'Título', example: 'Casa moderna en zona residencial' },
  { key: 'direccion', label: 'Dirección', example: 'Av. Principal 123, Ciudad' },
  { key: 'precio', label: 'Precio', example: '250000' },
  { key: 'area', label: 'Área (m²)', example: '150' },
  { key: 'habitaciones', label: 'Habitaciones', example: '3' },
  { key: 'banos', label: 'Baños', example: '2' },
  { key: 'tipo', label: 'Tipo', example: 'casa, departamento, terreno, local, oficina' },
  { key: 'descripcion', label: 'Descripción', example: 'Hermosa casa con jardín...' },
  { key: 'añoConstruccion', label: 'Año de construcción', example: '2020' },
  { key: 'pisos', label: 'Pisos', example: '2' }
]

export default function PropertyImportCSV({ isOpen, onClose, onImportComplete }) {
  if (!isOpen) return null
  
  const [step, setStep] = useState('upload') // upload, preview, importing, done
  const [file, setFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showMapping, setShowMapping] = useState(true)
  const fileInputRef = useRef(null)

  // Descargar plantilla
  const downloadTemplate = async () => {
    try {
      const response = await api.get('/properties/import-template')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'plantilla_propiedades.csv'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      }
    } catch (err) {
      // Crear plantilla local si el servidor no responde
      const template = EXPECTED_FIELDS.map(f => f.key).join(',') + '\n' +
        'Casa ejemplo,Av. Principal 100,200000,120,3,2,casa,Descripción de ejemplo,2019,2'
      
      const blob = new Blob([template], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_propiedades.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    }
  }

  // Parsear línea CSV manejando comillas
  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    
    return result
  }

  // Parsear archivo CSV
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 2) return { headers: [], data: [] }
    
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine)
    
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length > 0 && values.some(v => v.trim())) {
        const row = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] || ''
        })
        data.push(row)
      }
    }
    
    return { headers, data }
  }

  // Auto-mapear headers a campos esperados
  const autoMapHeaders = (csvHeaders) => {
    const mapping = {}
    const fieldLower = EXPECTED_FIELDS.map(f => f.key.toLowerCase())
    
    csvHeaders.forEach(header => {
      const h = header.toLowerCase().trim()
      
      // Matching exacto o parcial
      const match = EXPECTED_FIELDS.find(f => 
        f.key.toLowerCase() === h ||
        f.label.toLowerCase() === h ||
        h.includes(f.key.toLowerCase()) ||
        f.key.toLowerCase().includes(h)
      )
      
      if (match) {
        mapping[header] = match.key
      }
    })
    
    return mapping
  }

  // Manejar selección de archivo
  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setError('Por favor selecciona un archivo CSV')
      return
    }
    
    setFile(selectedFile)
    setError(null)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let content = e.target.result || ''
        content = content.replace(/^\uFEFF/, '')
        
        const { headers, data } = parseCSV(content)
        
        if (headers.length === 0) {
          setError('No se encontraron encabezados en el archivo')
          return
        }
        
        if (data.length === 0) {
          setError('No se encontraron datos en el archivo')
          return
        }
        
        setHeaders(headers)
        setParsedData(data)
        setMapping(autoMapHeaders(headers))
        setStep('preview')
      } catch (err) {
        setError('Error al parsear el archivo: ' + err.message)
      }
    }
    reader.readAsText(selectedFile)
  }

  // Actualizar mapeo de campo
  const updateMapping = (csvHeader, internalField) => {
    setMapping(prev => ({
      ...prev,
      [csvHeader]: internalField
    }))
  }

  // Importar propiedades
  const importProperties = async () => {
    setImporting(true)
    setStep('importing')
    
    try {
      // Transformar datos según el mapeo
      const propertiesData = parsedData.map(row => {
        const mapped = {}
        for (const [csvHeader, value] of Object.entries(row)) {
          const internalField = mapping[csvHeader]
          if (internalField) {
            mapped[internalField] = value
          }
        }
        return mapped
      })
      
      const response = await api.post('/properties/import-csv', { properties: propertiesData })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al importar propiedades')
      }
      
      setResult(data)
      setStep('done')
      
      if (onImportComplete) {
        onImportComplete(data.properties)
      }
    } catch (err) {
      setError(err.message)
      setStep('preview')
    } finally {
      setImporting(false)
    }
  }

  // Render
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Importar Propiedades desde CSV</h2>
            <p className="text-slate-400 mt-1">Carga un archivo CSV con tus propiedades</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Descargar plantilla */}
              <div className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">¿No tienes un archivo?</p>
                    <p className="text-slate-400 text-sm">Descarga nuestra plantilla</p>
                  </div>
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm"
                >
                  <Download className="w-4 h-4" />
                  Descargar Plantilla
                </button>
              </div>

              {/* Área de drop */}
              <div 
                className={`
                  border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                  ${file ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <Check className="w-8 h-8 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-slate-400 text-sm">{Math.round(file.size / 1024)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-white font-medium">Arrastra tu archivo CSV aquí</p>
                    <p className="text-slate-400 text-sm mt-2">o haz clic para seleccionar</p>
                  </>
                )}
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {/* Campos esperados */}
              <div className="bg-slate-700/30 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Campos aceptados en el CSV:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {EXPECTED_FIELDS.map(field => (
                    <div key={field.key} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">{field.label}:</span>
                      <code className="text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">{field.key}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && parsedData && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{file?.name}</p>
                    <p className="text-slate-400 text-sm">{parsedData.length} propiedades encontradas</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setStep('upload') }}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Mapeo de campos */}
              <div className="bg-slate-700/30 rounded-xl p-4">
                <button 
                  onClick={() => setShowMapping(!showMapping)}
                  className="flex items-center gap-2 text-white font-medium w-full"
                >
                  {showMapping ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Mapeo de campos CSV → Sistema
                </button>
                
                {showMapping && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {headers.map(header => (
                      <div key={header} className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm flex-1 truncate">{header}</span>
                        <span className="text-slate-600">→</span>
                        <select
                          value={mapping[header] || ''}
                          onChange={(e) => updateMapping(header, e.target.value)}
                          className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white flex-1"
                        >
                          <option value="">Sin asignar</option>
                          {EXPECTED_FIELDS.map(field => (
                            <option key={field.key} value={field.key}>{field.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vista previa de datos */}
              <div className="bg-slate-700/30 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Vista previa ({Math.min(5, parsedData.length)} de {parsedData.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        {headers.map(h => (
                          <th key={h} className="text-left text-slate-400 p-2 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          {headers.map(h => (
                            <td key={h} className="text-slate-300 p-2 whitespace-nowrap max-w-40 overflow-hidden text-ellipsis">
                              {row[h] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {/* Botón importar */}
              <div className="flex justify-end gap-3">
                <button 
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={importProperties}
                  disabled={Object.keys(mapping).length === 0}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-xl text-white font-medium flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importar {parsedData.length} propiedades
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Importando propiedades...</p>
              <p className="text-slate-400 mt-2">Generando contenido con IA automáticamente</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">¡Importación exitosa!</h3>
                <p className="text-slate-400 mt-2">
                  {result.imported} propiedades importadas
                  {result.properties?.filter(p => p.contentGenerated).length > 0 && 
                    ` • ${result.properties.filter(p => p.contentGenerated).length} con contenido IA`}
                </p>
              </div>

              {result.errors > 0 && (
                <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4">
                  <p className="text-amber-200 font-medium">{result.errors} propiedades con errores</p>
                  <ul className="mt-2 text-sm text-amber-200/70">
                    {result.errorDetails?.slice(0, 3).map((e, i) => (
                      <li key={i}>• {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lista de propiedades importadas */}
              <div className="bg-slate-700/30 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3">Propiedades importadas:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.properties?.map((prop, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="text-white text-sm">{prop.title}</p>
                        <p className="text-slate-400 text-xs">{prop.address}</p>
                      </div>
                      {prop.contentGenerated ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs">
                          <Check className="w-3 h-3" /> IA
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Sin contenido</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={onClose}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}