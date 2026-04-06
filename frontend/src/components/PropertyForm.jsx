import { useState, useRef } from 'react'
import { Upload, Image, X, Home, Loader2, Check, Plus } from 'lucide-react'

const PROPERTY_TYPES = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'local', label: 'Local Comercial' },
  { value: 'oficina', label: 'Oficina' }
]

const DEFAULT_FEATURES = [
  { id: 'jardin', label: 'Jardín', icon: '🌳' },
  { id: 'alberca', label: 'Alberca', icon: '🏊' },
  { id: 'estacionamiento', label: 'Estacionamiento', icon: '🚗' },
  { id: 'mascotas', label: 'Acepta Mascotas', icon: '🐕' },
  { id: 'seguridad', label: 'Seguridad 24/7', icon: '🔒' },
  { id: 'gimnasio', label: 'Gimnasio', icon: '💪' },
  { id: 'roofGarden', label: 'Roof Garden', icon: '🌿' },
  { id: 'cisterna', label: 'Cisterna', icon: '💧' },
  { id: 'paneles', label: 'Paneles Solares', icon: '☀️' },
  { id: 'climatizacion', label: 'Climatización', icon: '❄️' },
  { id: 'amueblado', label: 'Amueblado', icon: '🛋️' },
  { id: 'bodega', label: 'Bodega', icon: '📦' }
]

export default function PropertyForm({ onSubmit, isLoading }) {
  const [images, setImages] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [selectedFeatures, setSelectedFeatures] = useState([])
  const [customFeature, setCustomFeature] = useState('')
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    price: '',
    area: '',
    bedrooms: '3',
    bathrooms: '2',
    propertyType: 'casa',
    description: '',
    yearBuilt: '',
    floors: '1'
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileSelect = (files) => {
    const validFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    )
    setImages(prev => [...prev, ...validFiles])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const toggleFeature = (featureId) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    )
  }

  const addCustomFeature = () => {
    if (customFeature.trim() && !selectedFeatures.includes(customFeature.trim())) {
      setSelectedFeatures(prev => [...prev, customFeature.trim()])
      setCustomFeature('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const allFeatures = [
      ...selectedFeatures.map(id => {
        const defaultFeature = DEFAULT_FEATURES.find(f => f.id === id)
        return defaultFeature ? defaultFeature.label : id
      })
    ]
    onSubmit({ ...formData, images, features: allFeatures })
  }

  const isValid = formData.title && formData.address && formData.price && formData.area && images.length > 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/20 rounded-full text-primary-300 text-sm mb-4">
          <Home className="w-4 h-4" />
          Demo de Venta
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Crea tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-emerald-400">MVP de Real Estate</span>
        </h1>
        <p className="text-slate-400 text-lg">
          Sube fotos, completa los datos y deja que la IA genere todo el contenido de marketing por ti.
        </p>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-8">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            📸 Fotos de la Propiedad *
          </label>
          
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-primary-500 bg-primary-500/10' 
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-primary-400' : 'text-slate-500'}`} />
            <p className="text-slate-300 font-medium">
              Arrastra las fotos aquí o haz clic para seleccionar
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Soporta JPG, PNG, WEBP (máx. 10MB cada una)
            </p>
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-4 md:grid-cols-6 gap-3">
              {images.map((file, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Tipo de Propiedad
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {PROPERTY_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, propertyType: type.value }))}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  formData.propertyType === type.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Título de la Propiedad *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ej: Casa moderna en zona residencial"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Dirección Completa *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Ej: Av. Insurgentes Sur 1234, CDMX"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
            />
          </div>
        </div>

        {/* Price & Size */}
        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Precio (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="250,000"
                className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Superficie (m²) *
            </label>
            <input
              type="number"
              name="area"
              value={formData.area}
              onChange={handleChange}
              placeholder="120"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Habitaciones
            </label>
            <input
              type="number"
              name="bedrooms"
              value={formData.bedrooms}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Baños
            </label>
            <input
              type="number"
              name="bathrooms"
              value={formData.bathrooms}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
            />
          </div>
        </div>

        {/* Additional Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Año de Construcción
            </label>
            <input
              type="number"
              name="yearBuilt"
              value={formData.yearBuilt}
              onChange={handleChange}
              placeholder="2020"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Número de Pisos
            </label>
            <input
              type="number"
              name="floors"
              value={formData.floors}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
            />
          </div>
        </div>

        {/* Features Section */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            ✨ Características de la Propiedad
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {DEFAULT_FEATURES.map(feature => (
              <button
                key={feature.id}
                type="button"
                onClick={() => toggleFeature(feature.id)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedFeatures.includes(feature.id)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <span>{feature.icon}</span>
                <span>{feature.label}</span>
                {selectedFeatures.includes(feature.id) && (
                  <Check className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </div>
          
          {/* Custom Feature Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customFeature}
              onChange={(e) => setCustomFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFeature())}
              placeholder="Agregar característica personalizada..."
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
            />
            <button
              type="button"
              onClick={addCustomFeature}
              className="px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {/* Selected Custom Features */}
          {selectedFeatures.filter(f => !DEFAULT_FEATURES.find(df => df.id === f || df.label === f)).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedFeatures
                .filter(f => !DEFAULT_FEATURES.find(df => df.id === f || df.label === f))
                .map((feature, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-sm flex items-center gap-1"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => setSelectedFeatures(prev => prev.filter(p => p !== feature))}
                      className="hover:text-amber-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Descripción Adicional (opcional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Agrega detalles adicionales sobre la propiedad..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
            isValid && !isLoading
              ? 'bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-white shadow-lg shadow-primary-500/25'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Generando contenido con IA...
            </>
          ) : (
            <>
              <Image className="w-6 h-6" />
              Generar Contenido con IA
            </>
          )}
        </button>

        {!isValid && (
          <p className="text-center text-slate-500 text-sm">
            ⚠️ Completa todos los campos obligatorios (*) y agrega al menos una foto
          </p>
        )}
      </form>
    </div>
  )
}
