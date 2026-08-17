import { useState, useMemo, useEffect } from 'react'
import { 
  Calendar, Clock, Instagram, Facebook, Globe, Twitter,
  X, ChevronLeft, ChevronRight, Check, AlertCircle, Image, Square,
  Minus, ArrowUp, ArrowDown, Plus
} from 'lucide-react'
import { api } from '../utils/api'

const TIME_GROUPS = [
  { id: 'madrugada', label: 'Madrugada', icon: '🌙', range: [0, 6] },
  { id: 'maniana', label: 'Mañana', icon: '🌅', range: [6, 12] },
  { id: 'tarde', label: 'Tarde', icon: '☀️', range: [12, 18] },
  { id: 'noche', label: 'Noche', icon: '🌆', range: [18, 24] }
]

const generateTimeSlots = (startHour, endHour) => {
  const slots = []
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push({
        value: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        label: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      })
    }
  }
  return slots
}

const ALL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'pink', supportsStory: true },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'blue', supportsStory: true },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'slate', supportsStory: false },
  { id: 'portal', name: 'Portales', icon: Globe, color: 'emerald', supportsStory: false }
]

const getSpanishDays = () => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const getSpanishMonths = () => ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function ScheduleModal({ isOpen, onClose, onScheduled, property = null }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  })
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedTimeGroup, setSelectedTimeGroup] = useState('maniana')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram'])
  const [expandedPlatforms, setExpandedPlatforms] = useState({})
  const [bothConfirmed, setBothConfirmed] = useState({})
  const [bothActiveTab, setBothActiveTab] = useState({})
  const [platformSettings, setPlatformSettings] = useState({
    instagram: { publishType: null, post: { images: [] }, story: { image: null } },
    facebook: { publishType: null, post: { images: [], subType: 'feed' }, story: { image: null } },
    twitter: { publishType: null, post: { images: [] } },
    portal: { publishType: null, post: { images: [] } }
  })

  // Reset all states when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setError(null)
      setSelectedDate(() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow
      })
      setSelectedTime('09:00')
      setSelectedTimeGroup('maniana')
      setSelectedPlatforms(['instagram'])
      setExpandedPlatforms({})
      setBothConfirmed({})
      setBothActiveTab({})
      setPlatformSettings({
        instagram: { publishType: null, post: { images: [] }, story: { image: null } },
        facebook: { publishType: null, post: { images: [], subType: 'feed' }, story: { image: null } },
        twitter: { publishType: null, post: { images: [] } },
        portal: { publishType: null, post: { images: [] } }
      })
    }
  }, [isOpen])

  const spanishDays = getSpanishDays()
  const spanishMonths = getSpanishMonths()

  const propertyImages = useMemo(() => {
    if (!property?.images) return []
    return property.images.map(img => typeof img === 'string' ? { url: img } : img)
  }, [property?.images])

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({ date: new Date(year, month, -firstDay.getDay() + i + 1), currentMonth: false })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), currentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false })
    }
    return days
  }, [calendarMonth])

  const formatSelectedDate = () => {
    const dayName = spanishDays[selectedDate.getDay()]
    const day = selectedDate.getDate()
    const month = spanishMonths[selectedDate.getMonth()]
    return `${dayName}, ${day} de ${month}`
  }

  const formatSelectedTime = () => {
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const togglePlatform = (platformId) => {
    setError(null)
    setSelectedPlatforms(prev => prev.includes(platformId) ? prev.filter(p => p !== platformId) : [...prev, platformId])
    setExpandedPlatforms(prev => ({ ...prev, [platformId]: true }))
  }

  const setPublishType = (platformId, type) => {
    setPlatformSettings(prev => ({ ...prev, [platformId]: { ...prev[platformId], publishType: type } }))
    if (type === 'both') {
      setBothConfirmed(prev => ({ ...prev, [platformId]: false }))
      setBothActiveTab(prev => ({ ...prev, [platformId]: 'post' }))
    }
  }

  const togglePostImage = (platformId, imageUrl) => {
    setPlatformSettings(prev => {
      const current = prev[platformId]?.post?.images || []
      const newImages = current.includes(imageUrl) ? current.filter(i => i !== imageUrl) : [...current, imageUrl]
      return { ...prev, [platformId]: { ...prev[platformId], post: { ...prev[platformId].post, images: newImages } } }
    })
  }

  const movePostImage = (platformId, imageUrl, direction) => {
    setPlatformSettings(prev => {
      const images = [...(prev[platformId]?.post?.images || [])]
      const idx = images.indexOf(imageUrl)
      if (idx === -1) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= images.length) return prev
      const [item] = images.splice(idx, 1)
      images.splice(newIdx, 0, item)
      return { ...prev, [platformId]: { ...prev[platformId], post: { ...prev[platformId].post, images } } }
    })
  }

  const removePostImage = (platformId, imageUrl) => {
    setPlatformSettings(prev => ({
      ...prev,
      [platformId]: { ...prev[platformId], post: { ...prev[platformId].post, images: (prev[platformId]?.post?.images || []).filter(i => i !== imageUrl) } }
    }))
  }

  const setStoryImage = (platformId, imageUrl) => {
    setPlatformSettings(prev => ({ ...prev, [platformId]: { ...prev[platformId], story: { image: imageUrl } } }))
  }

  const setSubType = (platformId, subType) => {
    setPlatformSettings(prev => ({ ...prev, [platformId]: { ...prev[platformId], post: { ...prev[platformId].post, subType } } }))
  }

  const handleBothConfirmed = (platformId) => {
    const settings = platformSettings[platformId]
    if (!settings.post?.images?.length || !settings.story?.image) {
      setError('Debes seleccionar imágenes para Post e Historia')
      return
    }
    setBothConfirmed(prev => ({ ...prev, [platformId]: true }))
    setError(null)
  }

  const handleBothEdit = (platformId) => {
    setBothConfirmed(prev => ({ ...prev, [platformId]: false }))
  }

  const handleSchedule = async () => {
    if (selectedPlatforms.length === 0) {
      setError('Selecciona al menos una plataforma')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const scheduledDate = new Date(selectedDate)
      const [hours, minutes] = selectedTime.split(':')
      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      const platforms = selectedPlatforms.map(platformId => ({
        platform: platformId,
        enabled: true,
        scheduled: true,
        scheduledTime: selectedTime,
        ...platformSettings[platformId]
      }))
      const postData = {
        title: property?.title 
          ? `${property.title} - ${formatSelectedDate()}`
          : `Programación - ${formatSelectedDate()}`,
        description: property?.title 
          ? `Publicación de ${property.title}` 
          : 'Publicación programada',
        scheduledDate: scheduledDate.toISOString(),
        platforms,
        content: { caption: 'Nueva publicación programada', images: platforms.flatMap(p => p.post?.images || []).filter(Boolean) },
        propertyId: property?.id || null,
        status: 'scheduled'
      }
      const response = await api.post('/schedule/manual', postData)
      if (!response.ok) throw new Error('Error al guardar')
      const result = await response.json()
      onClose()
      setTimeout(() => onScheduled?.(result.post, { date: formatSelectedDate(), time: selectedTime, platforms: selectedPlatforms }), 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null
  
  // Show warning if no property is selected
  const hasProperty = property && propertyImages.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Programar Publicación</h2>
            <p className="text-slate-400 text-xs">Paso {step} de 4</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1 p-3 bg-slate-800/50 text-xs">
          {['Fecha', 'Hora', 'Plataformas', 'Confirmar'].map((label, idx) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium ${step > idx + 1 ? 'bg-emerald-500 text-white' : step === idx + 1 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {step > idx + 1 ? '✓' : idx + 1}
              </div>
              <span className={`hidden sm:inline ${step === idx + 1 ? 'text-white' : 'text-slate-500'}`}>{label}</span>
              {idx < 3 && <div className="w-6 h-0.5 bg-slate-700 mx-1" />}
            </div>
          ))}
        </div>
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" /> Fecha
              </h3>
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-1">
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="p-1 hover:bg-slate-700 rounded">
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </button>
                  <span className="text-white font-medium text-sm capitalize">{spanishMonths[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="p-1 hover:bg-slate-700 rounded">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {spanishDays.map(day => <div key={day} className="text-center text-xs text-slate-500 py-1">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(({ date, currentMonth }, idx) => {
                    const isPast = new Date(date.setHours(0,0,0,0)) < new Date(new Date().setHours(0,0,0,0))
                    const isSelected = date.toDateString() === selectedDate.toDateString()
                    const isToday = date.toDateString() === new Date().toDateString()
                    return (
                      <button key={idx} onClick={() => !isPast && currentMonth && setSelectedDate(date)} disabled={!currentMonth || isPast}
                        className={`aspect-square rounded text-xs font-medium transition-all ${!currentMonth ? 'text-slate-600' : ''} ${isPast && currentMonth ? 'text-slate-600 cursor-not-allowed' : ''} ${isSelected ? 'bg-blue-500 text-white' : isToday ? 'bg-slate-700 text-white' : currentMonth ? 'hover:bg-slate-700 text-slate-300' : ''}`}>
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-400 text-xs">Fecha:</p>
                <p className="text-white font-medium">{formatSelectedDate()}</p>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> Hora
              </h3>
              <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                {TIME_GROUPS.map(group => (
                  <button key={group.id} onClick={() => setSelectedTimeGroup(group.id)}
                    className={`flex-1 py-2 px-1 rounded-md text-xs font-medium transition-all flex flex-col items-center gap-1 ${selectedTimeGroup === group.id ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                    <span className="text-base">{group.icon}</span>
                    <span>{group.label}</span>
                  </button>
                ))}
              </div>
              {TIME_GROUPS.filter(g => g.id === selectedTimeGroup).map(group => {
                const slots = generateTimeSlots(group.range[0], group.range[1])
                return (
                  <div key={group.id} className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                    <div className="grid grid-cols-6 gap-1">
                      {slots.map(slot => (
                        <button key={slot.value} onClick={() => setSelectedTime(slot.value)}
                          className={`py-1.5 rounded text-xs font-mono transition-colors ${selectedTime === slot.value ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-4 text-center">
                <p className="text-slate-400 text-sm">Hora seleccionada</p>
                <p className="text-4xl font-mono font-bold text-white mt-1">{formatSelectedTime()}</p>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" /> Plataformas
              </h3>
              {!hasProperty && (
                <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-amber-400 font-medium">No hay propiedad seleccionada</p>
                    <p className="text-amber-300/80 text-xs mt-1">Seleccioná una propiedad de la lista para poder elegir las imágenes.</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {ALL_PLATFORMS.map(platform => {
                  const Icon = platform.icon
                  const isSelected = selectedPlatforms.includes(platform.id)
                  const settings = platformSettings[platform.id] || {}
                  const colors = {
                    pink: { border: isSelected ? 'border-pink-500' : 'border-slate-700', icon: 'text-pink-400', bg: 'bg-pink-500/20' },
                    blue: { border: isSelected ? 'border-blue-500' : 'border-slate-700', icon: 'text-blue-400', bg: 'bg-blue-500/20' },
                    slate: { border: isSelected ? 'border-slate-400' : 'border-slate-700', icon: 'text-slate-300', bg: 'bg-slate-500/20' },
                    emerald: { border: isSelected ? 'border-emerald-500' : 'border-slate-700', icon: 'text-emerald-400', bg: 'bg-emerald-500/20' }
                  }
                  return (
                    <div key={platform.id} className={`bg-slate-800 rounded-xl border ${colors[platform.color].border} overflow-hidden`}>
                      <button onClick={() => togglePlatform(platform.id)} className="w-full p-3 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[platform.color].bg}`}>
                          <Icon className={`w-5 h-5 ${colors[platform.color].icon}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white font-medium">{platform.name}</p>
                          <p className="text-slate-400 text-xs">{platform.supportsStory ? 'Post + Historia' : 'Post'}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                      {isSelected && (
                        <div className="p-3 border-t border-slate-700 space-y-3">
                          {platform.supportsStory && (
                            <div className="flex gap-2">
                              <button onClick={() => setPublishType(platform.id, 'post')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${settings.publishType === 'post' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                <Image className="w-4 h-4" /> Post
                              </button>
                              <button onClick={() => setPublishType(platform.id, 'story')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${settings.publishType === 'story' ? 'bg-pink-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                <Square className="w-4 h-4" /> Historia
                              </button>
                              <button onClick={() => setPublishType(platform.id, 'both')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${settings.publishType === 'both' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                Ambos
                              </button>
                            </div>
                          )}
                          {settings.publishType === 'both' && (
                            <div className="space-y-3">
                              {bothConfirmed[platform.id] ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Configuración guardada
                                    </span>
                                    <button onClick={() => handleBothEdit(platform.id)} className="text-xs text-slate-400 hover:text-white">Editar</button>
                                  </div>
                                  <div className="flex gap-3 text-xs">
                                    <div className="flex items-center gap-1">
                                      <Image className="w-3 h-3 text-blue-400" />
                                      <span className="text-slate-300">Post ({settings.post?.images?.length || 0})</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Square className="w-3 h-3 text-pink-400" />
                                      <span className="text-slate-300">Historia (1)</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
                                    <button onClick={() => setBothActiveTab(prev => ({ ...prev, [platform.id]: 'post' }))}
                                      className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${bothActiveTab[platform.id] !== 'story' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                                      <Image className="w-3 h-3" /> Post
                                    </button>
                                    <button onClick={() => setBothActiveTab(prev => ({ ...prev, [platform.id]: 'story' }))}
                                      className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${bothActiveTab[platform.id] === 'story' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                                      <Square className="w-3 h-3" /> Historia
                                    </button>
                                  </div>
                                  {bothActiveTab[platform.id] !== 'story' && (
                                    <div className="space-y-2">
                                      <p className="text-slate-400 text-xs">Seleccioná las imágenes para el Post (click para agregar/quitar):</p>
                                      <div className="flex gap-3 overflow-x-auto pb-2">
                                        {propertyImages.map((img, idx) => {
                                          const isSel = settings.post?.images?.includes(img.url)
                                          return (
                                            <div key={idx} onClick={() => togglePostImage(platform.id, img.url)}
                                              className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSel ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-600 hover:border-slate-400'}`}>
                                              <img src={img.url} alt="" className="w-full h-full object-cover" />
                                              {isSel && <div className="absolute inset-0 bg-blue-500/70 flex items-center justify-center"><Check className="w-6 h-6 text-white" /></div>}
                                              {!isSel && <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center"><Plus className="w-5 h-5 text-white" /></div>}
                                            </div>
                                          )
                                        })}
                                      </div>
                                      {settings.post?.images?.length > 0 && (
                                        <div className="space-y-1">
                                          {settings.post.images.map((imgUrl, idx) => (
                                            <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-slate-700 rounded text-xs">
                                              <span className="w-5 h-5 bg-slate-600 rounded flex items-center justify-center text-slate-300 font-medium">{idx + 1}</span>
                                              <img src={imgUrl} alt="" className="w-6 h-6 rounded object-cover" />
                                              <div className="flex-1" />
                                              <button onClick={() => movePostImage(platform.id, imgUrl, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                                              <button onClick={() => movePostImage(platform.id, imgUrl, 'down')} disabled={idx === settings.post.images.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                                              <button onClick={() => removePostImage(platform.id, imgUrl)} className="p-1 text-red-400 hover:text-red-300"><Minus className="w-3 h-3" /></button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {bothActiveTab[platform.id] === 'story' && (
                                    <div className="space-y-2">
                                      <p className="text-slate-400 text-xs">Elegí UNA imagen para la Historia:</p>
                                      <div className="flex gap-3 overflow-x-auto">
                                        {propertyImages.map((img, idx) => (
                                          <div key={idx} onClick={() => setStoryImage(platform.id, img.url)}
                                            className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${settings.story?.image === img.url ? 'border-pink-500 ring-2 ring-pink-500/50' : 'border-slate-600 hover:border-slate-400'}`}>
                                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                                            {settings.story?.image === img.url && <div className="absolute inset-0 bg-pink-500/70 flex items-center justify-center"><Check className="w-6 h-6 text-white" /></div>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <button onClick={() => handleBothConfirmed(platform.id)}
                                    disabled={!settings.post?.images?.length || !settings.story?.image}
                                    className={`w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${!settings.post?.images?.length || !settings.story?.image ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                                    <Check className="w-3 h-3" /> Confirmar configuración
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Image selector for Post - shows for platforms with stories OR platforms without stories (Twitter, Portal) */}
                          {(settings.publishType === 'post' || !platform.supportsStory) && propertyImages.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-slate-400 text-xs">Seleccioná las imágenes para el Post (click para agregar/quitar):</p>
                              <div className="flex gap-3 overflow-x-auto pb-2">
                                {propertyImages.map((img, idx) => {
                                  const isSel = settings.post?.images?.includes(img.url)
                                  return (
                                    <div key={idx} onClick={() => togglePostImage(platform.id, img.url)}
                                      className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSel ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-600 hover:border-slate-400'}`}>
                                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                                      {isSel && <div className="absolute inset-0 bg-blue-500/70 flex items-center justify-center"><Check className="w-6 h-6 text-white" /></div>}
                                      {!isSel && <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center"><Plus className="w-5 h-5 text-white" /></div>}
                                    </div>
                                  )
                                })}
                              </div>
                              {settings.post?.images?.length > 0 && (
                                <div className="space-y-1">
                                  {settings.post.images.map((imgUrl, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded text-xs">
                                      <span className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center text-slate-300 font-medium">{idx + 1}</span>
                                      <img src={imgUrl} alt="" className="w-8 h-8 rounded object-cover" />
                                      <div className="flex-1" />
                                      <button onClick={() => movePostImage(platform.id, imgUrl, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                                      <button onClick={() => movePostImage(platform.id, imgUrl, 'down')} disabled={idx === settings.post.images.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                                      <button onClick={() => removePostImage(platform.id, imgUrl)} className="p-1 text-red-400 hover:text-red-300"><Minus className="w-4 h-4" /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {settings.publishType === 'story' && propertyImages.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-slate-400 text-xs">Elegí UNA imagen para la Historia:</p>
                              <div className="flex gap-3 overflow-x-auto">
                                {propertyImages.map((img, idx) => (
                                  <div key={idx} onClick={() => setStoryImage(platform.id, img.url)}
                                    className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${settings.story?.image === img.url ? 'border-pink-500 ring-2 ring-pink-500/50' : 'border-slate-600 hover:border-slate-400'}`}>
                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                    {settings.story?.image === img.url && <div className="absolute inset-0 bg-pink-500/70 flex items-center justify-center"><Check className="w-6 h-6 text-white" /></div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {propertyImages.length === 0 && <p className="text-slate-500 text-xs">No hay imágenes disponibles</p>}
                          {error && settings.publishType && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                              <span className="text-red-400 text-xs">{error}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {selectedPlatforms.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 text-sm">Seleccioná al menos una plataforma</span>
                </div>
              )}
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Confirmar</h3>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div><p className="text-slate-400 text-xs">Fecha</p><p className="text-white font-medium">{formatSelectedDate()}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div><p className="text-slate-400 text-xs">Hora</p><p className="text-white font-mono font-medium">{selectedTime}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-slate-400 text-xs">Plataformas</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedPlatforms.map(pId => {
                        const p = ALL_PLATFORMS.find(x => x.id === pId)
                        const Icon = p.icon
                        const s = platformSettings[pId] || {}
                        return (
                          <span key={pId} className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-white">
                            <Icon className="w-3 h-3" />{p.name}
                            {s.publishType === 'story' && <span className="text-pink-400">(H)</span>}
                            {s.publishType === 'both' && <span className="text-purple-400">(2)</span>}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-800/50">
          <button onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${step === 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700'}`}>
            Anterior
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)}
              disabled={(step === 3 && selectedPlatforms.length === 0) || (step === 3 && selectedPlatforms.some(pId => platformSettings[pId]?.publishType === 'both' && !bothConfirmed[pId]))}
              className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${(step === 3 && selectedPlatforms.length === 0) || (step === 3 && selectedPlatforms.some(pId => platformSettings[pId]?.publishType === 'both' && !bothConfirmed[pId])) ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}>
              Siguiente
            </button>
          ) : (
            <button onClick={handleSchedule} disabled={loading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors flex items-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
              ) : (
                <><Check className="w-4 h-4" />Programar</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
