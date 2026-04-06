import { useState, useEffect } from 'react'
import { 
  Zap, Clock, Mail, MessageCircle, Phone, Instagram,
  CheckCircle2, AlertCircle, Play, Settings, Users,
  ChevronRight, Send, Calendar, Target, Plus,
  X, Edit3, Save, Copy, Eye, RefreshCw, Trash2,
  Facebook, MessageSquare, Loader2, Check, Pause,
  PlayCircle, Rocket, Sparkles, Bell, ArrowRight
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
})

// Channel icons and colors
const CHANNEL_CONFIG = {
  whatsapp: { icon: MessageCircle, color: 'emerald', label: 'WhatsApp', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
  email: { icon: Mail, color: 'blue', label: 'Email', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  instagram: { icon: Instagram, color: 'pink', label: 'Instagram', bgColor: 'bg-pink-500/20', textColor: 'text-pink-400' },
  messenger: { icon: Facebook, color: 'blue', label: 'Messenger', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' }
}

const CHANNELS = ['whatsapp', 'email', 'instagram', 'messenger']

// ==========================================
// COMPONENTE: Success Popup Animation
// ==========================================
const SuccessPopup = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
      <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Check className="w-6 h-6" />
        </div>
        <div>
          <p className="font-semibold">¡Éxito!</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: Animated Card
// ==========================================
const AnimatedCard = ({ children, delay = 0, className = '' }) => (
  <div 
    className={`animate-fade-in-up ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
)

// ==========================================
// COMPONENTE: Send Animation Modal
// ==========================================
const SendAnimationModal = ({ isOpen, channel, onClose }) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('sending') // sending, success, error
  
  useEffect(() => {
    if (!isOpen) return
    
    setProgress(0)
    setStatus('sending')
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setStatus('success')
          setTimeout(onClose, 1500)
          return 100
        }
        return prev + 5
      })
    }, 100)
    
    return () => clearInterval(interval)
  }, [isOpen])

  if (!isOpen) return null

  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.whatsapp
  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl p-8 w-80 text-center border border-slate-700 shadow-2xl animate-scale-in">
        {status === 'sending' ? (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center animate-pulse">
              <Icon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Enviando mensaje...</h3>
            <p className="text-slate-400 mb-4">via {config.label}</p>
            
            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-slate-500 text-sm mt-2">{progress}%</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center animate-bounce-in">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Mensaje enviado!</h3>
            <p className="text-emerald-400">El mensaje fue enviado exitosamente</p>
          </>
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: Confirm Popup
// ==========================================
const ConfirmPopup = ({ isOpen, title, message, confirmText, onConfirm, onCancel, type = 'danger' }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl p-6 w-96 border border-slate-700 shadow-2xl animate-scale-in">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6">{message}</p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-white font-medium transition-colors ${
              type === 'danger' 
                ? 'bg-red-600 hover:bg-red-500' 
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: Sequence Editor Modal
// ==========================================
const SequenceEditorModal = ({ isOpen, onClose, sequence, onSave }) => {
  const [localSequence, setLocalSequence] = useState(sequence)
  const [activeStep, setActiveStep] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLocalSequence(sequence)
    setActiveStep(sequence?.steps?.[0] || null)
  }, [sequence])

  if (!isOpen || !localSequence) return null

  const updateStep = (stepId, updates) => {
    setLocalSequence(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
    }))
    if (activeStep?.id === stepId) {
      setActiveStep(prev => ({ ...prev, ...updates }))
    }
  }

  const toggleChannel = (stepId, channel) => {
    const step = localSequence.steps.find(s => s.id === stepId)
    const channels = step.channels.includes(channel)
      ? step.channels.filter(c => c !== channel)
      : [...step.channels, channel]
    updateStep(stepId, { channels })
  }

  const updateTemplate = (stepId, channel, field, value) => {
    const step = localSequence.steps.find(s => s.id === stepId)
    const templates = {
      ...step.templates,
      [channel]: {
        ...step.templates?.[channel],
        [field]: value
      }
    }
    updateStep(stepId, { templates })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(localSequence)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Error saving sequence:', err)
    } finally {
      setSaving(false)
    }
  }

  const stepColors = ['blue', 'violet', 'amber', 'emerald', 'pink', 'cyan', 'orange', 'purple']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Editar Secuencia</h2>
              <p className="text-slate-400 text-sm">{localSequence.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Steps List */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="text-white font-medium mb-3">Pasos de la secuencia</h3>
              {localSequence.steps.map((step, idx) => {
                const isActive = activeStep?.id === step.id
                const colorClass = stepColors[idx % stepColors.length]
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step)}
                    className={`w-full text-left p-4 rounded-xl border transition-all animate-fade-in-up ${
                      isActive 
                        ? 'bg-blue-500/20 border-blue-500/50' 
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">Día {step.day}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        step.channels.length > 0 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-slate-600 text-slate-400'
                      }`}>
                        {step.channels.length} canales
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{step.label}</p>
                  </button>
                )
              })}
            </div>

            {/* Step Editor */}
            <div className="lg:col-span-2 space-y-4">
              {activeStep && (
                <>
                  {/* Step Info */}
                  <div className="bg-slate-700/50 rounded-xl p-4 animate-fade-in-up">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Día</label>
                        <input
                          type="number"
                          value={activeStep.day}
                          onChange={(e) => updateStep(activeStep.id, { day: parseInt(e.target.value) || 1 })}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Nombre</label>
                        <input
                          type="text"
                          value={activeStep.label}
                          onChange={(e) => updateStep(activeStep.id, { label: e.target.value })}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Channels */}
                  <div className="bg-slate-700/50 rounded-xl p-4 animate-fade-in-up">
                    <h4 className="text-white font-medium mb-3">Canales activos</h4>
                    <div className="flex flex-wrap gap-2">
                      {CHANNELS.map(channel => {
                        const config = CHANNEL_CONFIG[channel]
                        const isActive = activeStep.channels?.includes(channel)
                        return (
                          <button
                            key={channel}
                            onClick={() => toggleChannel(activeStep.id, channel)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                              isActive 
                                ? `${config.bgColor} ${config.textColor} border border-current/30`
                                : 'bg-slate-600 text-slate-400 border border-slate-500'
                            }`}
                          >
                            {isActive && <Check className="w-4 h-4" />}
                            {config.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Message Templates */}
                  <div className="space-y-4 animate-fade-in-up">
                    <h4 className="text-white font-medium">Plantillas de mensajes</h4>
                    
                    {activeStep.channels?.includes('whatsapp') && (
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">WhatsApp</span>
                        </div>
                        <textarea
                          value={activeStep.templates?.whatsapp?.message || ''}
                          onChange={(e) => updateTemplate(activeStep.id, 'whatsapp', 'message', e.target.value)}
                          placeholder="Escribí el mensaje... Usa {{name}}, {{propertyTitle}}, {{agentName}} como variables"
                          className="w-full h-24 bg-slate-600 rounded-lg px-3 py-2 text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}

                    {activeStep.channels?.includes('email') && (
                      <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 font-medium">Email</span>
                        </div>
                        <div>
                          <label className="block text-slate-400 text-sm mb-1">Asunto</label>
                          <input
                            type="text"
                            value={activeStep.templates?.email?.subject || ''}
                            onChange={(e) => updateTemplate(activeStep.id, 'email', 'subject', e.target.value)}
                            className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-sm mb-1">Cuerpo</label>
                          <textarea
                            value={activeStep.templates?.email?.body || ''}
                            onChange={(e) => updateTemplate(activeStep.id, 'email', 'body', e.target.value)}
                            className="w-full h-32 bg-slate-600 rounded-lg px-3 py-2 text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {activeStep.channels?.includes('instagram') && (
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Instagram className="w-4 h-4 text-pink-400" />
                          <span className="text-pink-400 font-medium">Instagram DM</span>
                        </div>
                        <textarea
                          value={activeStep.templates?.instagram?.message || ''}
                          onChange={(e) => updateTemplate(activeStep.id, 'instagram', 'message', e.target.value)}
                          className="w-full h-24 bg-slate-600 rounded-lg px-3 py-2 text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}

                    {activeStep.channels?.includes('messenger') && (
                      <div className="bg-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Facebook className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 font-medium">Messenger</span>
                        </div>
                        <textarea
                          value={activeStep.templates?.messenger?.message || ''}
                          onChange={(e) => updateTemplate(activeStep.id, 'messenger', 'message', e.target.value)}
                          className="w-full h-24 bg-slate-600 rounded-lg px-3 py-2 text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}

                    <p className="text-slate-500 text-xs">
                      Variables: {'{{name}}'}, {'{{propertyTitle}}'}, {'{{price}}'}, {'{{agentName}}'}, {'{{address}}'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-white transition-colors flex items-center gap-2 ${
              saved 
                ? 'bg-emerald-600' 
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? '¡Guardado!' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: Message Preview Modal (MEJORADO)
// ==========================================
const MessagePreviewModal = ({ isOpen, onClose, step, lead, onSend, onGenerateAlternative, generating }) => {
  const [alternativeMessages, setAlternativeMessages] = useState([])
  const [selectedAlternative, setSelectedAlternative] = useState(null)
  const [sendingChannel, setSendingChannel] = useState(null)
  const [sendingAlternative, setSendingAlternative] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationChannel, setAnimationChannel] = useState('whatsapp')

  useEffect(() => {
    setAlternativeMessages([])
    setSelectedAlternative(null)
  }, [step, lead, isOpen])

  if (!isOpen || !step || !lead) return null

  const getMessagePreview = (channel) => {
    const template = step.templates?.[channel]
    if (!template) return null

    if (channel === 'email') {
      return {
        subject: template.subject?.replace(/{{name}}/g, lead.name?.split(' ')[0])
                       .replace(/{{propertyTitle}}/g, lead.propertyTitle || 'la propiedad'),
        body: template.body?.replace(/{{name}}/g, lead.name?.split(' ')[0])
                       .replace(/{{propertyTitle}}/g, lead.propertyTitle || 'la propiedad')
      }
    }

    return {
      message: template.message?.replace(/{{name}}/g, lead.name?.split(' ')[0])
                    .replace(/{{propertyTitle}}/g, lead.propertyTitle || 'la propiedad')
    }
  }

  const handleSend = async (channel) => {
    setSendingChannel(channel)
    setAnimationChannel(channel)
    setShowAnimation(true)
    
    try {
      await onSend(lead, channel, step)
    } catch (err) {
      console.error('Error sending:', err)
    }
  }

  const handleSendAlternative = async (alt) => {
    setSendingAlternative(true)
    setAnimationChannel(alt.channel)
    setShowAnimation(true)
    
    try {
      await onSend(lead, alt.channel, step, alt.message)
      setSelectedAlternative(null)
    } catch (err) {
      console.error('Error sending alternative:', err)
    }
  }

  const handleGenerateAlternatives = async () => {
    const alts = await onGenerateAlternative(step, lead)
    setAlternativeMessages(alts || [])
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-violet-400" />
                  {step.label}
                </h2>
                <p className="text-slate-400 text-sm">Lead: {lead.name}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
            {/* Channel Previews */}
            {step.channels?.map(channel => {
              const config = CHANNEL_CONFIG[channel]
              const Icon = config.icon
              const preview = getMessagePreview(channel)

              if (!preview) return null

              return (
                <div key={channel} className="bg-slate-700/50 rounded-xl p-4 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                        <Icon className={`w-4 h-4 ${config.textColor}`} />
                      </div>
                      <span className={`${config.textColor} font-medium`}>{config.label}</span>
                    </div>
                    
                    <button
                      onClick={() => handleSend(channel)}
                      disabled={sendingChannel === channel}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-all hover:scale-105"
                    >
                      {sendingChannel === channel ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Enviar
                    </button>
                  </div>

                  {channel === 'email' ? (
                    <div className="space-y-2">
                      <div className="text-slate-400 text-sm">Asunto: <span className="text-white">{preview.subject}</span></div>
                      <div className="bg-slate-800 rounded-lg p-3 text-white text-sm whitespace-pre-wrap">
                        {preview.body}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800 rounded-lg p-3 text-white text-sm whitespace-pre-wrap">
                      {preview.message}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Alternative Messages Section */}
            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Alternativas generadas por IA
                </h4>
                <button
                  onClick={handleGenerateAlternatives}
                  disabled={generating}
                  className="px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm flex items-center gap-2 transition-all hover:scale-105"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Generar nuevas
                </button>
              </div>
              
              {alternativeMessages.length > 0 ? (
                <div className="space-y-3">
                  {alternativeMessages.map((alt, idx) => {
                    const config = CHANNEL_CONFIG[alt.channel] || CHANNEL_CONFIG.whatsapp
                    const Icon = config.icon
                    const isSelected = selectedAlternative === alt
                    
                    return (
                      <div 
                        key={idx}
                        className={`rounded-xl border transition-all animate-fade-in-up ${
                          isSelected 
                            ? 'bg-violet-500/10 border-violet-500/50' 
                            : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                        }`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                                <Icon className={`w-4 h-4 ${config.textColor}`} />
                              </div>
                              <span className="text-xs text-slate-400 capitalize">{alt.style}</span>
                            </div>
                            
                            <button
                              onClick={() => handleSendAlternative(alt)}
                              disabled={sendingAlternative}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm flex items-center gap-1 transition-all hover:scale-105"
                            >
                              <Send className="w-3 h-3" />
                              Enviar esta
                            </button>
                          </div>
                          
                          <p 
                            className="text-white text-sm cursor-pointer hover:text-violet-300"
                            onClick={() => setSelectedAlternative(isSelected ? null : alt)}
                          >
                            {alt.message}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 bg-slate-700/30 rounded-xl">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Generá alternativas para ver nuevas opciones</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700 bg-slate-800/50">
            <p className="text-slate-500 text-sm text-center">
              💡 Podés editar el texto antes de enviar o usar una alternativa generada por IA
            </p>
          </div>
        </div>
      </div>

      {/* Send Animation */}
      <SendAnimationModal 
        isOpen={showAnimation} 
        channel={animationChannel} 
        onClose={() => setShowAnimation(false)} 
      />
    </>
  )
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function AutomationPage() {
  const [leads, setLeads] = useState([])
  const [sequences, setSequences] = useState([])
  const [activeSequence, setActiveSequence] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Modals & Popups
  const [showSequenceEditor, setShowSequenceEditor] = useState(false)
  const [showMessagePreview, setShowMessagePreview] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [selectedStep, setSelectedStep] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState(null)
  
  // Sending states
  const [sendingLead, setSendingLead] = useState(null)
  const [generatingAlternatives, setGeneratingAlternatives] = useState(false)

  // Track leads in automation with their status
  const [leadsInAutomation, setLeadsInAutomation] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [leadsRes, sequencesRes] = await Promise.all([
        fetch(`${API_URL}/leads`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/automation/sequences`, { headers: getAuthHeaders() })
      ])

      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setLeads(data.leads || [])
        
        // Initialize automation status for each lead
        const automationStatus = {}
        data.leads?.forEach(lead => {
          automationStatus[lead.id] = {
            active: lead.followUps?.length < (activeSequence?.steps?.length || 4),
            paused: false,
            completed: lead.followUps?.length >= (activeSequence?.steps?.length || 4)
          }
        })
        setLeadsInAutomation(automationStatus)
      }

      if (sequencesRes.ok) {
        const data = await sequencesRes.json()
        setSequences(data.sequences || [])
        const active = data.sequences?.find(s => s.isActive)
        setActiveSequence(active || data.sequences?.[0] || null)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSequence = async (sequence) => {
    const response = await fetch(`${API_URL}/automation/sequences/${sequence.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(sequence)
    })
    
    if (!response.ok) throw new Error('Error al guardar')
    
    await loadData()
    showSuccessPopup('Secuencia actualizada correctamente')
  }

  const generateAlternatives = async (step, lead) => {
    setGeneratingAlternatives(true)
    try {
      const response = await fetch(`${API_URL}/automation/generate-alternatives`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ step, lead })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.alternatives || []
      }
    } catch (err) {
      console.error('Error generating alternatives:', err)
    } finally {
      setGeneratingAlternatives(false)
    }
    return []
  }

  const sendMessage = async (lead, channel, step, customMessage = null) => {
    setSendingLead(lead.id)

    try {
      const template = step.templates?.[channel]
      let message = customMessage || (channel === 'email' ? template?.body : template?.message) || ''

      // Replace variables
      message = message
        .replace(/{{name}}/g, lead.name?.split(' ')[0])
        .replace(/{{propertyTitle}}/g, lead.propertyTitle || 'la propiedad')
        .replace(/{{agentName}}/g, 'Tu Asesor')

      // Send (simulated)
      await fetch(`${API_URL}/automation/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lead,
          channel,
          message,
          stepId: step.id,
          sequenceId: activeSequence?.id
        })
      })

      // Reload data to update
      await loadData()
      
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSendingLead(null)
    }
  }

  const pauseLeadAutomation = (leadId) => {
    setLeadsInAutomation(prev => ({
      ...prev,
      [leadId]: { ...prev[leadId], paused: true, active: false }
    }))
    showSuccessPopup('Secuencia pausada para este lead')
  }

  const resumeLeadAutomation = (leadId) => {
    setLeadsInAutomation(prev => ({
      ...prev,
      [leadId]: { ...prev[leadId], paused: false, active: true }
    }))
    showSuccessPopup('Secuencia reactivada')
  }

  const showSuccessPopup = (message) => {
    setSuccessMessage(message)
    setShowSuccess(true)
  }

  // Stats
  const stats = {
    totalLeads: leads.length,
    inAutomation: leads.filter(l => leadsInAutomation[l.id]?.active && !leadsInAutomation[l.id]?.paused).length,
    paused: leads.filter(l => leadsInAutomation[l.id]?.paused).length,
    pending: leads.filter(l => l.status !== 'respondio' && l.status !== 'perdido').length
  }

  // Color map for timeline
  const stepColors = ['blue', 'violet', 'amber', 'emerald', 'pink', 'cyan', 'orange', 'purple']

  return (
    <div className="space-y-6">
      {/* Success Popup */}
      {showSuccess && (
        <SuccessPopup 
          message={successMessage} 
          onClose={() => setShowSuccess(false)} 
        />
      )}

      {/* Header */}
      <AnimatedCard delay={0}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Automatización</h1>
            <p className="text-slate-400 mt-1">Secuencias de follow-up con IA</p>
          </div>
          <button
            onClick={() => setShowSequenceEditor(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all hover:scale-105"
          >
            <Settings className="w-5 h-5" />
            Configurar Secuencia
          </button>
        </div>
      </AnimatedCard>

      {/* Stats Overview */}
      <AnimatedCard delay={100}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl p-5 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-medium">Total Leads</span>
            </div>
            <h3 className="text-3xl font-bold text-white">{stats.totalLeads}</h3>
          </div>

          <div className="bg-gradient-to-br from-violet-500/20 to-violet-600/10 rounded-2xl p-5 border border-violet-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-violet-400" />
              <span className="text-violet-400 font-medium">En Secuencia</span>
            </div>
            <h3 className="text-3xl font-bold text-white">{stats.inAutomation}</h3>
          </div>

          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl p-5 border border-amber-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Pause className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-medium">Pausados</span>
            </div>
            <h3 className="text-3xl font-bold text-white">{stats.paused}</h3>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-5 border border-emerald-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Pendientes</span>
            </div>
            <h3 className="text-3xl font-bold text-white">{stats.pending}</h3>
          </div>
        </div>
      </AnimatedCard>

      {/* How Leads Enter Automation - Info Box */}
      <AnimatedCard delay={200}>
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/30">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            ¿Cómo entran los leads a la automatización?
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-cyan-400 font-medium mb-1">1. Manualmente</p>
              <p className="text-slate-400">Agregá leads desde la sección "Leads" y se activarán en la secuencia</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-cyan-400 font-medium mb-1">2. Formularios Web</p>
              <p className="text-slate-400">Integración futura con webhooks de formularios (Gravity Forms, Typeform)</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-cyan-400 font-medium mb-1">3. Redes Sociales</p>
              <p className="text-slate-400">Cuando conectes las APIs de Meta, los leads de IG/FB entrarán automáticamente</p>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Automation Sequence Timeline */}
      <AnimatedCard delay={300}>
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">{activeSequence?.name || 'Secuencia de Follow-up'}</h2>
              <p className="text-slate-400 text-sm">{activeSequence?.description || 'Automatización activa'}</p>
            </div>
            <button
              onClick={() => setShowSequenceEditor(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-all hover:scale-105"
            >
              <Edit3 className="w-4 h-4" />
              Editar
            </button>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700 hidden md:block" />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {activeSequence?.steps?.map((step, idx) => {
                  const colorClass = stepColors[idx % stepColors.length]
                  const colorClasses = {
                    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
                    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
                  }

                  return (
                    <div 
                      key={step.id} 
                      className="relative flex items-start gap-4 animate-fade-in-up"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className={`relative z-10 w-12 h-12 rounded-2xl border flex items-center justify-center ${colorClasses[colorClass]}`}>
                        <span className="text-lg font-bold">{step.day}</span>
                      </div>

                      <div className="flex-1 bg-slate-700/50 rounded-xl p-5 border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white">{step.label}</h3>
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Activo
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          {step.channels?.map(channel => {
                            const config = CHANNEL_CONFIG[channel]
                            const Icon = config.icon
                            return (
                              <span 
                                key={channel}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bgColor} ${config.textColor}`}
                              >
                                <Icon className="w-3 h-3" />
                                {config.label}
                              </span>
                            )
                          })}
                        </div>

                        {step.channels?.includes('whatsapp') && step.templates?.whatsapp?.message && (
                          <div className="bg-slate-800 rounded-lg p-3 text-slate-300 text-sm">
                            <MessageCircle className="w-3 h-3 inline mr-1 text-emerald-400" />
                            {step.templates.whatsapp.message.substring(0, 80)}...
                          </div>
                        )}
                      </div>

                      <div className="hidden md:flex items-center">
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </AnimatedCard>

      {/* Leads needing follow-up */}
      <AnimatedCard delay={400}>
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Leads en automatización</h2>
              <p className="text-slate-400 text-sm">Gestiona la secuencia de follow-up para cada lead</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay leads registrados</p>
              <p className="text-sm mt-1">Agregá leads desde la sección de Leads</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leads
                .filter(l => l.status !== 'respondio' && l.status !== 'perdido')
                .slice(0, 8)
                .map((lead, idx) => {
                  const followUpCount = lead.followUps?.length || 0
                  const nextStep = activeSequence?.steps?.[followUpCount]
                  const isSending = sendingLead === lead.id
                  const leadStatus = leadsInAutomation[lead.id] || { active: true, paused: false, completed: false }
                  const isPaused = leadStatus.paused
                  const isCompleted = leadStatus.completed || followUpCount >= (activeSequence?.steps?.length || 4)

                  return (
                    <div 
                      key={lead.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all animate-fade-in-up ${
                        isPaused 
                          ? 'bg-slate-700/30 border-amber-500/30' 
                          : 'bg-slate-700/50 border-slate-600 hover:border-blue-500/30'
                      }`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {lead.name?.charAt(0) || '?'}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white truncate">{lead.name}</h4>
                          {isPaused && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                              Pausado
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                              Completado
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm truncate">
                          {lead.propertyTitle || lead.propertyInterest || 'Sin propiedad asignada'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            lead.channel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400' :
                            lead.channel === 'instagram' ? 'bg-pink-500/20 text-pink-400' :
                            lead.channel === 'email' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {lead.channel || 'sin canal'}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {followUpCount}/{activeSequence?.steps?.length || 0} mensajes
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="hidden md:block w-24">
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                            style={{ width: `${(followUpCount / (activeSequence?.steps?.length || 4)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Pause/Resume Button */}
                        {!isCompleted && (
                          <button
                            onClick={() => isPaused ? resumeLeadAutomation(lead.id) : pauseLeadAutomation(lead.id)}
                            className={`p-2 rounded-lg transition-all hover:scale-110 ${
                              isPaused 
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                            }`}
                            title={isPaused ? 'Reactivar' : 'Pausar'}
                          >
                            {isPaused ? <PlayCircle className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                          </button>
                        )}

                        {nextStep && !isPaused ? (
                          <button
                            onClick={() => {
                              setSelectedLead(lead)
                              setSelectedStep(nextStep)
                              setShowMessagePreview(true)
                            }}
                            disabled={isSending}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-all hover:scale-105"
                          >
                            {isSending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Rocket className="w-4 h-4" />
                            )}
                            {isSending ? 'Enviando...' : 'Enviar'}
                          </button>
                        ) : isCompleted ? (
                          <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Secuencia completa
                          </span>
                        ) : isPaused ? (
                          <span className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm flex items-center gap-1">
                            <Pause className="w-4 h-4" />
                            Pausado
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </AnimatedCard>

      {/* AI Message Preview Info */}
      <AnimatedCard delay={500}>
        <div className="bg-gradient-to-br from-violet-500/10 to-blue-500/10 rounded-2xl p-6 border border-violet-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Mensajes generados con IA</h3>
              <p className="text-slate-400 text-sm">Personalización automática según cada lead</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-300 text-sm">
                  <span className="text-emerald-400 font-medium">WhatsApp:</span> Tono casual y directo, ideal para seguimiento rápido
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-300 text-sm">
                  <span className="text-blue-400 font-medium">Email:</span> Formal y detallado, incluye información completa de la propiedad
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Instagram className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <p className="text-slate-300 text-sm">
                  <span className="text-pink-400 font-medium">Instagram DM:</span> Tono amigable, aprovecha el contexto visual
                </p>
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-xs mt-4">
            💡 Podés editar las plantillas y generar alternativas con diferentes tonos
          </p>
        </div>
      </AnimatedCard>

      {/* Modals */}
      <SequenceEditorModal
        isOpen={showSequenceEditor}
        onClose={() => setShowSequenceEditor(false)}
        sequence={activeSequence}
        onSave={saveSequence}
      />

      <MessagePreviewModal
        isOpen={showMessagePreview}
        onClose={() => {
          setShowMessagePreview(false)
          setSelectedLead(null)
          setSelectedStep(null)
        }}
        step={selectedStep}
        lead={selectedLead}
        onSend={sendMessage}
        onGenerateAlternative={generateAlternatives}
        generating={generatingAlternatives}
      />

      {/* Confirm Dialog */}
      <ConfirmPopup
        isOpen={!!confirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmText={confirmAction?.confirmText}
        type={confirmAction?.type || 'danger'}
        onConfirm={() => {
          confirmAction?.onConfirm()
          setConfirmAction(null)
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes bounce-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.5s ease-out forwards;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
