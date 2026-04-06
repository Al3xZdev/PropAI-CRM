import { useState, useMemo, useEffect } from 'react'
import { 
  X, Calendar, Clock, Instagram, Facebook, Globe, Twitter,
  CheckCircle2, Trash2, Send, Copy, Image, Square,
  ChevronLeft, ChevronRight, Users, FileText
} from 'lucide-react'

const PLATFORM_CONFIG = {
  instagram: { 
    name: 'Instagram', 
    icon: Instagram, 
    color: 'pink', 
    gradient: 'from-purple-500 to-pink-500',
    supportsStory: true,
    supportsPost: true
  },
  facebook: { 
    name: 'Facebook', 
    icon: Facebook, 
    color: 'blue', 
    gradient: 'from-blue-600 to-blue-500',
    supportsStory: true,
    supportsPost: true,
    supportsGroups: true,
    supportsFeed: true
  },
  twitter: { 
    name: 'Twitter/X', 
    icon: Twitter, 
    color: 'slate', 
    gradient: 'from-slate-600 to-slate-500',
    supportsStory: false,
    supportsPost: true
  },
  portal: { 
    name: 'Portales', 
    icon: Globe, 
    color: 'emerald', 
    gradient: 'from-emerald-500 to-green-500',
    supportsStory: false,
    supportsPost: true
  }
}

const TYPE_CONFIG = {
  just_listed: { icon: '🏠', label: 'Fotos + Just Listed', color: 'blue' },
  video_reel: { icon: '🎬', label: 'Video / Reel', color: 'pink' },
  open_house: { icon: '📅', label: 'Open House', color: 'amber' },
  price_update: { icon: '💰', label: 'Actualización de Precio', color: 'emerald' }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return {
    full: `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`,
    time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }
}

export default function PostDetailModal({ 
  isOpen, 
  onClose, 
  post, 
  property,
  onPublish, 
  onDelete, 
  onCancel
}) {
  // ============ ALL HOOKS MUST BE HERE ============
  
  const [activePlatform, setActivePlatform] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [platformSettings, setPlatformSettings] = useState({})
  const [isEditingText, setIsEditingText] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [textSaved, setTextSaved] = useState(false)
  
  // Get unique platforms
  const uniquePlatforms = useMemo(() => {
    if (!post?.platforms) return []
    const supported = ['instagram', 'facebook', 'portal']
    const seen = new Set()
    const result = []
    post.platforms.forEach(p => {
      const key = p.platform?.toLowerCase()
      if (p.enabled && !seen.has(key) && supported.includes(key)) {
        seen.add(key)
        result.push(p)
      }
    })
    return result
  }, [post?.platforms])
  
  // Initialize platform settings
  useEffect(() => {
    if (post?.platforms) {
      const initial = {}
      post.platforms.forEach(p => {
        if (!initial[p.platform]) {
          initial[p.platform] = {
            publishType: 'post',
            images: p.images || [],
            showText: true
          }
        }
      })
      setPlatformSettings(initial)
    }
  }, [post?.platforms])
  
  // Initialize active platform
  useEffect(() => {
    if (!activePlatform && uniquePlatforms.length > 0) {
      setActivePlatform(uniquePlatforms[0].platform)
    }
  }, [uniquePlatforms, activePlatform])
  
  // Get property images
  const propertyImages = useMemo(() => {
    if (!property?.images) return []
    return property.images.map(img => typeof img === 'string' ? { url: img } : img)
  }, [property?.images])
  
  // ============ END OF HOOKS ============
  
  // Early return AFTER all hooks
  if (!isOpen || !post) return null
  
  const typeConfig = TYPE_CONFIG[post.type] || TYPE_CONFIG.just_listed
  const dateInfo = formatDate(post.scheduledDate)
  const isPublished = post.status === 'published'
  const isPast = new Date(post.scheduledDate) < new Date()
  
  const currentPlatform = PLATFORM_CONFIG[activePlatform] || PLATFORM_CONFIG.instagram
  const currentSettings = platformSettings[activePlatform] || { publishType: 'post', images: [], showText: true }
  
  // Get content for current platform
  const getPlatformContent = () => {
    if (post.content?.captions?.[activePlatform]) return post.content.captions[activePlatform]
    if (post.content?.caption) return post.content.caption
    if (post.content?.content) {
      return typeof post.content.content === 'string' 
        ? post.content.content 
        : post.content.content[activePlatform] || post.description
    }
    return post.description || 'Sin contenido definido'
  }
  
  const copyToClipboard = () => {
    const text = isEditingText ? editedText : getPlatformContent()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const startEditingText = () => {
    setEditedText(getPlatformContent())
    setIsEditingText(true)
    setTextSaved(false)
  }
  
  const saveEditedText = () => {
    setIsEditingText(false)
    setTextSaved(true)
    setTimeout(() => setTextSaved(false), 2000)
  }
  
  const cancelEditingText = () => {
    setIsEditingText(false)
    setEditedText('')
  }
  
  const toggleImage = (imageUrl) => {
    const images = currentSettings.images || []
    if (currentSettings.publishType === 'story') {
      setPlatformSettings(prev => ({
        ...prev,
        [activePlatform]: { ...prev[activePlatform], images: [imageUrl], showText: false }
      }))
      return
    }
    
    if (images.includes(imageUrl)) {
      setPlatformSettings(prev => ({
        ...prev,
        [activePlatform]: { ...prev[activePlatform], images: images.filter(img => img !== imageUrl) }
      }))
    } else {
      setPlatformSettings(prev => ({
        ...prev,
        [activePlatform]: { ...prev[activePlatform], images: [...images, imageUrl] }
      }))
    }
  }
  
  const setPublishType = (type) => {
    setPlatformSettings(prev => ({
      ...prev,
      [activePlatform]: {
        ...prev[activePlatform],
        publishType: type,
        images: type === 'story' 
          ? [(currentSettings.images || [])[0] || propertyImages[0]?.url].filter(Boolean)
          : currentSettings.images || [],
        showText: type !== 'story'
      }
    }))
  }
  
  const setSubType = (subType) => {
    setPlatformSettings(prev => ({
      ...prev,
      [activePlatform]: {
        ...prev[activePlatform],
        subType
      }
    }))
  }
  
  const handlePublish = () => {
    onPublish?.(activePlatform, platformSettings)
    onClose()
  }
  
  const currentImage = currentSettings.images?.[0] || propertyImages[0]?.url
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
                typeConfig.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                typeConfig.color === 'pink' ? 'from-pink-500 to-rose-500' :
                typeConfig.color === 'amber' ? 'from-amber-500 to-orange-500' :
                'from-emerald-500 to-green-500'
              } flex items-center justify-center`}>
                <span className="text-2xl">{typeConfig.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{post.title}</h2>
                <p className="text-slate-400 text-sm">{typeConfig.label}</p>
                {isPublished && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs mt-2">
                    <CheckCircle2 className="w-3 h-3" /> Publicado
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-6">
          
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Fecha</span>
              </div>
              <p className="text-white font-medium">{dateInfo.full}</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Hora</span>
              </div>
              <p className="text-white font-medium">{dateInfo.time}</p>
            </div>
          </div>
          
          {/* Platform Tabs */}
          <div>
            <h3 className="text-white font-medium mb-3">Plataforma</h3>
            <div className="flex gap-2 flex-wrap">
              {uniquePlatforms.map(p => {
                const config = PLATFORM_CONFIG[p.platform] || PLATFORM_CONFIG.instagram
                const Icon = config.icon
                return (
                  <button
                    key={p.platform}
                    onClick={() => setActivePlatform(p.platform)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activePlatform === p.platform
                        ? `bg-gradient-to-r ${config.gradient} text-white`
                        : 'bg-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.name}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Publish Type Selector */}
          {currentPlatform.supportsStory && (
            <div>
              <h3 className="text-white font-medium mb-3">Tipo de publicación para {currentPlatform.name}</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setPublishType('post')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
                    currentSettings.publishType === 'post'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Image className="w-5 h-5" />
                  <span className="font-medium">Solo Post</span>
                </button>
                <button
                  onClick={() => setPublishType('story')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
                    currentSettings.publishType === 'story'
                      ? 'border-pink-500 bg-pink-500/20 text-white'
                      : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Square className="w-5 h-5" />
                  <span className="font-medium">Solo Historia</span>
                </button>
                <button
                  onClick={() => setPublishType('both')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
                    currentSettings.publishType === 'both'
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Image className="w-5 h-5" />
                  <span className="font-medium">Ambos</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Facebook Feed/Groups Selector */}
          {activePlatform === 'facebook' && currentPlatform.supportsGroups && (
            <div>
              <h3 className="text-white font-medium mb-3">Destino para Facebook</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setSubType('feed')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
                    currentSettings.subType === 'feed'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Feed</span>
                </button>
                <button
                  onClick={() => setSubType('groups')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
                    currentSettings.subType === 'groups'
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Grupos</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Image Selector */}
          <div>
            <h3 className="text-white font-medium mb-3">
              Imágenes 
              {currentSettings.publishType === 'story' && (
                <span className="text-pink-400 text-sm ml-2">(máximo 1)</span>
              )}
            </h3>
            
            {propertyImages.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {propertyImages.map((img, idx) => {
                  const isSelected = currentSettings.images?.includes(img.url)
                  const imgOrder = currentSettings.images?.indexOf(img.url)
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleImage(img.url)}
                      className={`relative shrink-0 w-24 h-24 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected 
                          ? 'border-blue-500 ring-2 ring-blue-500/30' 
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/40 flex items-center justify-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {imgOrder + 1}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-slate-700/50 rounded-xl p-8 text-center text-slate-400">
                No hay imágenes disponibles. Agregá imágenes a la propiedad primero.
              </div>
            )}
            
            {currentSettings.images?.length > 0 && (
              <p className="text-slate-400 text-sm mt-2">
                Orden: {currentSettings.images.map((_, i) => i + 1).join(' → ')}
              </p>
            )}
          </div>
          
          {/* Preview */}
          <div>
            <h3 className="text-white font-medium mb-3">Vista previa</h3>
            <div className="flex gap-4 items-start">
              {currentSettings.publishType === 'story' ? (
                <div className="flex flex-col items-center">
                  <div className="bg-black rounded-xl overflow-hidden w-32" style={{ aspectRatio: '9/16' }}>
                    {currentImage ? (
                      <img src={currentImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">Sin imagen</div>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-2">Historia (9:16)</p>
                </div>
              ) : (
                <div className="flex-1 space-y-3">
                  {currentSettings.images?.length > 0 ? (
                    <div className="bg-slate-900 rounded-xl overflow-hidden" style={{ aspectRatio: '1/1' }}>
                      <img src={currentImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="bg-slate-700 rounded-xl" style={{ aspectRatio: '1/1' }}>
                      <div className="w-full h-full flex items-center justify-center text-slate-500">Seleccioná una imagen</div>
                    </div>
                  )}
                  {currentSettings.showText && (
                    <div className="bg-slate-900 rounded-xl p-3">
                      <p className="text-white text-sm whitespace-pre-wrap line-clamp-3">
                        {textSaved ? editedText : getPlatformContent()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Text (only for posts) */}
          {currentSettings.showText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium">Texto de la publicación</h3>
                <div className="flex gap-2">
                  {isEditingText ? (
                    <>
                      <button
                        onClick={saveEditedText}
                        className="px-3 py-1 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={cancelEditingText}
                        className="px-3 py-1 rounded-lg text-sm bg-slate-700 text-slate-300 hover:bg-slate-600"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={startEditingText}
                        className="px-3 py-1 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        Editar Texto
                      </button>
                      <button
                        onClick={copyToClipboard}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {copied ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {isEditingText ? (
                <div className="space-y-2">
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full h-48 bg-slate-700/50 rounded-xl p-4 text-white whitespace-pre-wrap resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Escribí el texto para tu publicación..."
                  />
                  <p className="text-slate-500 text-xs">
                    {editedText.length} caracteres
                  </p>
                </div>
              ) : (
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className={`text-white whitespace-pre-wrap ${textSaved ? 'ring-2 ring-emerald-500/50 rounded-lg p-2' : ''}`}>
                    {textSaved ? editedText : getPlatformContent()}
                  </p>
                  {textSaved && (
                    <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                      ✓ Texto personalizado guardado
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50 space-y-3">
          {!isPublished && !isPast && (
            <button
              onClick={handlePublish}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Publicar en {currentPlatform.name}
              {currentSettings.publishType === 'both' && ' (2 publicaciones)'}
            </button>
          )}
          
          <div className="flex gap-3">
            {!isPublished && (
              <button
                onClick={() => { onCancel?.(post.id); onClose() }}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 font-medium transition-colors"
              >
                Cancelar programación
              </button>
            )}
            <button
              onClick={() => {
                if (showDeleteConfirm) {
                  onDelete?.(post.id)
                  onClose()
                } else {
                  setShowDeleteConfirm(true)
                }
              }}
              className={`py-3 px-6 rounded-xl font-medium transition-colors ${
                showDeleteConfirm
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {showDeleteConfirm ? '¿Confirmar?' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
