// Unified Inbox Page - DemoRealState
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../hooks/useTheme'
import { 
  Search, MoreVertical, Paperclip, Send, 
  Image as ImageIcon, FileText, X, Upload, Loader2,
  MessageCircle, Mail, Facebook, Instagram, Check, CheckCheck,
  Clock, Plus, User, ChevronDown, Trash2, AlertCircle
} from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { api } from '../utils/api'

// Channel configuration
const CHANNEL_CONFIG = {
  whatsapp: { 
    icon: MessageCircle, 
    color: 'emerald', 
    label: 'WhatsApp', 
    bgColor: 'bg-emerald-500/20', 
    textColor: 'text-emerald-400',
    iconColor: 'text-emerald-400'
  },
  email: { 
    icon: Mail, 
    color: 'blue', 
    label: 'Email', 
    bgColor: 'bg-blue-500/20', 
    textColor: 'text-blue-400',
    iconColor: 'text-blue-400'
  },
  instagram: { 
    icon: Instagram, 
    color: 'pink', 
    label: 'Instagram', 
    bgColor: 'bg-pink-500/20', 
    textColor: 'text-pink-400',
    iconColor: 'text-pink-400'
  },
  messenger: { 
    icon: Facebook, 
    color: 'blue', 
    label: 'Messenger', 
    bgColor: 'bg-blue-500/20', 
    textColor: 'text-blue-400',
    iconColor: 'text-blue-400'
  }
}

const CHANNELS = ['whatsapp', 'instagram', 'messenger', 'email']

// Textos en español e inglés
const TEXTS = {
  es: {
    searchPlaceholder: 'Buscar conversaciones...',
    noConversations: 'No hay conversaciones',
    startConversation: 'Selecciona una conversación para comenzar',
    typeMessage: 'Escribe un mensaje...',
    send: 'Enviar',
    online: 'En línea',
    offline: 'Desconectado',
    files: 'archivos',
    file: 'archivo',
    selected: 'seleccionado',
    selectedPlural: 'seleccionados',
    clearAll: 'Limpiar todo',
    dragDrop: 'Suelta el archivo aquí',
    maxSize: 'Imágenes, videos o PDF hasta 16MB (máx 5)',
    noMessages: 'Sin mensajes aún',
    startChat: 'Este es el inicio de la conversación. Envía un mensaje.',
    today: 'Hoy',
    yesterday: 'Ayer'
  },
  en: {
    searchPlaceholder: 'Search conversations...',
    noConversations: 'No conversations',
    startConversation: 'Select a conversation to start',
    typeMessage: 'Type a message...',
    send: 'Send',
    online: 'Online',
    offline: 'Offline',
    files: 'files',
    file: 'file',
    selected: 'selected',
    selectedPlural: 'selected',
    clearAll: 'Clear all',
    dragDrop: 'Drop file here',
    maxSize: 'Images, videos or PDF up to 16MB (max 5)',
    noMessages: 'No messages yet',
    startChat: 'This is the start of the conversation. Send a message.',
    today: 'Today',
    yesterday: 'Yesterday'
  }
}

// Get initials from name
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ').filter(p => p.length > 0)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Format time for messages
const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

// Format date for message groups
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function InboxPage() {
  const { addNotification } = useNotifications()
  
  // Theme colors - always dark mode
  const colors = {
    background: '#17181c',
    card: '#17181c',
    foreground: '#e7e9ea',
    muted: '#72767a',
    border: '#242628',
    primary: '#1c9cf0',
    input: '#22303c',
  }
  
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [emails, setEmails] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // New conversation modal
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState('whatsapp')
  const [channelValidation, setChannelValidation] = useState({})
  
  // File attachment state (up to 5 files)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Conversation options menu
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  
  // Manual response modal
  const [showAddResponseModal, setShowAddResponseModal] = useState(false)
  const [responseSubject, setResponseSubject] = useState('')
  const [responseBody, setResponseBody] = useState('')
  
  // Convert to Lead modal
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertForm, setConvertForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [convertingLead, setConvertingLead] = useState(false)
  
  // Success/Error toast notification
  const [toast, setToast] = useState(null) // { type: 'success'|'error', message: string }
  
  // Show toast notification
  const showToast = (type, message) => {
    setToast({ type, message })
  }
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const refreshIntervalRef = useRef(null)
  const isFirstLoad = useRef(true)
  
  // Language (default to Spanish)
  const [lang, setLang] = useState('es')
  const t = TEXTS[lang]

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
    loadLeads()
  }, [])
  
  // Filter conversations - exclude email conversations without lead email
  const filteredConversations = conversations.filter(conv => {
    // If it's an email conversation, check if lead has email
    if (conv.channel === 'email') {
      const lead = leads.find(l => l.id === conv.leadId)
      return lead?.email // Only show if lead has email
    }
    return true // Show all non-email conversations
  })

  // Auto-refresh: load messages every 3 seconds (background refresh only)
  useEffect(() => {
    if (selectedConversation) {
      refreshIntervalRef.current = setInterval(async () => {
        loadMessages(selectedConversation.id)
        loadConversations(true) // Background refresh - don't show loading
        loadLeads() // Also refresh leads to update visitor status
      }, 3000)
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [selectedConversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load conversations - with option to skip loading state for background refresh
  const loadConversations = async (isBackgroundRefresh = false) => {
    const shouldShowLoading = !isBackgroundRefresh && isFirstLoad.current
    
    if (shouldShowLoading) {
      setLoading(true)
    }
    try {
      const response = await api.get('/chat/conversations')
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        
        // NO auto-select first conversation - user must click to select
        // This prevents showing conversation details when user just wants to see the list
        isFirstLoad.current = false
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      if (shouldShowLoading) {
        setLoading(false)
        isFirstLoad.current = false
      }
    }
  }

  // Load leads for new conversation modal
  const loadLeads = async () => {
    try {
      const response = await api.get('/leads')
      
      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads || [])
      }
    } catch (err) {
      console.error('Error loading leads:', err)
    }
  }

  // Validate channel data for a lead
  const validateChannelData = useCallback((lead, channel) => {
    const validation = { valid: false, message: '', field: '' }
    
    switch (channel) {
      case 'whatsapp':
        if (!lead.phone) {
          validation.message = 'El lead no tiene número de teléfono registrado'
          validation.field = 'phone'
        } else {
          // Normalize phone number (remove spaces, dashes, add country code if needed)
          const phone = lead.phone.replace(/[\s\-\(\)]/g, '')
          // Check if it's a valid WhatsApp format (at least 8 digits)
          if (phone.length < 8) {
            validation.message = 'El número de teléfono no es válido'
            validation.field = 'phone'
          } else {
            validation.valid = true
          }
        }
        break
        
      case 'email':
        if (!lead.email) {
          validation.message = 'El lead no tiene email registrado'
          validation.field = 'email'
        } else {
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(lead.email)) {
            validation.message = 'El email no es válido'
            validation.field = 'email'
          } else {
            validation.valid = true
          }
        }
        break
        
      case 'instagram':
        if (!lead.instagram) {
          validation.message = 'El lead no tiene usuario de Instagram registrado'
          validation.field = 'instagram'
        } else {
          // Instagram username validation (no @, alphanumeric with underscores)
          const instaRegex = /^[a-zA-Z0-9_.]+$/
          if (!instaRegex.test(lead.instagram) || lead.instagram.length < 1) {
            validation.message = 'El usuario de Instagram no es válido'
            validation.field = 'instagram'
          } else {
            validation.valid = true
          }
        }
        break
        
      case 'messenger':
        if (!lead.facebookId) {
          validation.message = 'El lead no tiene ID de Facebook/Messenger registrado'
          validation.field = 'facebookId'
        } else {
          validation.valid = true
        }
        break
        
      default:
        validation.message = 'Canal no soportado'
    }
    
    return validation
  }, [])

  // Validate when lead or channel changes
  useEffect(() => {
    if (selectedLead && selectedChannel) {
      const validation = validateChannelData(selectedLead, selectedChannel)
      setChannelValidation({ [selectedChannel]: validation })
    } else {
      setChannelValidation({})
    }
  }, [selectedLead, selectedChannel, validateChannelData])

  // Create new conversation
  const createNewConversation = async () => {
    if (!selectedLead || !selectedChannel) return
    
    // Validate before creating
    const validation = validateChannelData(selectedLead, selectedChannel)
    if (!validation.valid) {
      alert(validation.message)
      return
    }
    
    try {
      const response = await api.post('/chat/conversations', {
        leadId: selectedLead.id,
        channel: selectedChannel
      })
      
      if (response.ok) {
        const data = await response.json()
        // Close modal and refresh
        setShowNewConversation(false)
        setSelectedLead(null)
        setSelectedChannel('whatsapp')
        loadConversations()
        
        // Select the new conversation
        if (data.conversation) {
          selectConversation(data.conversation)
        }
      }
    } catch (err) {
      console.error('Error creating conversation:', err)
    }
  }

  const selectConversation = (conv) => {
    setSelectedConversation(conv)
    loadMessages(conv.id)
    
    // If channel is email, also load emails
    if (conv.channel === 'email' && conv.leadId) {
      loadEmails(conv.leadId)
    } else {
      setEmails([])
    }
  }

  // Load emails for a lead (when channel is email)
  const loadEmails = async (leadId) => {
    try {
      const response = await api.get(`/emails/lead/${leadId}`)
      if (response.ok) {
        const data = await response.json()
        setEmails(data.emails || [])
      }
    } catch (err) {
      console.error('Error loading emails:', err)
    }
  }

  // Send email via Resend
  const handleSendEmail = async () => {
    // Get email from lead data if not available in conversation
    let leadEmail = selectedConversation?.leadEmail || selectedConversation?.lead?.email
    
    // If still no email, try to get it from leads list
    if (!leadEmail && selectedConversation?.leadId) {
      const lead = leads.find(l => l.id === selectedConversation.leadId)
      leadEmail = lead?.email
    }
    
    if (!leadEmail) {
      alert('El lead no tiene email. Editá el lead para agregar un email.')
      return
    }
    
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('Por favor completá el asunto y el mensaje')
      return
    }
    
    setSendingEmail(true)
    try {
      const response = await api.post('/emails/send', {
        leadId: selectedConversation.leadId,
        to: leadEmail,
        subject: emailSubject.trim(),
        body: emailBody.trim()
      })
      
      if (response.ok) {
        const data = await response.json()
        // Add to local emails list
        setEmails(prev => [...prev, data.email])
        setShowEmailModal(false)
        setEmailSubject('')
        setEmailBody('')
        // Show success notification
        addNotification({
          type: 'post_published',
          title: 'Email enviado',
          description: `Email enviado exitosamente a ${leadEmail}`
        })
      } else {
        const err = await response.json()
        addNotification({
          type: 'post_error',
          title: 'Error',
          description: err.error || 'Error al enviar email'
        })
      }
    } catch (err) {
      console.error('Error sending email:', err)
      addNotification({
        type: 'post_error',
        title: 'Error',
        description: 'Error al enviar email'
      })
    } finally {
      setSendingEmail(false)
    }
  }

  // Delete conversation
  const deleteConversation = async () => {
    if (!selectedConversation) return
    
    try {
      const response = await api.delete(`/chat/conversations/${selectedConversation.id}`)
      
      if (response.ok) {
        setSelectedConversation(null)
        setMessages([])
        setShowDeleteConfirm(false)
        setShowOptionsMenu(false)
        loadConversations()
      }
    } catch (err) {
      console.error('Error deleting conversation:', err)
    }
  }

  // Add manual email response (when lead responds to your email in their inbox)
  const handleAddManualResponse = async () => {
    if (!selectedConversation?.leadId || !responseSubject.trim() || !responseBody.trim()) return
    
    try {
      const response = await api.post('/emails/manual-response', {
        leadId: selectedConversation.leadId,
        subject: responseSubject.trim(),
        body: responseBody.trim()
      })
      
      if (response.ok) {
        const data = await response.json()
        // Add to local emails list
        setEmails(prev => [...prev, data.email])
        setShowAddResponseModal(false)
        setResponseSubject('')
        setResponseBody('')
        addNotification({
          type: 'new_message',
          title: 'Respuesta registrada',
          description: `Respuesta de ${selectedConversation.leadName} registrada`
        })
      } else {
        const err = await response.json()
        alert('Error: ' + err.error)
      }
    } catch (err) {
      console.error('Error adding response:', err)
    }
  }

  const loadMessages = async (conversationId) => {
    setIsSyncing(true)
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`)
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        
        // Mark messages as read after loading
        await api.post(`/chat/conversations/${conversationId}/read`)
        
        // Dispatch event to update unread count in sidebar
        window.dispatchEvent(new CustomEvent('messagesRead'))
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  // File handling functions
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      validateAndSetFiles(files)
    }
  }

  const validateAndSetFiles = (files) => {
    if (selectedFiles.length + files.length > 5) {
      alert('Máximo 5 archivos permitidos.')
      return
    }

    const maxSize = 16 * 1024 * 1024
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`El archivo "${file.name}" es muy grande. Máximo 16MB.`)
        return false
      }
      return true
    })

    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      validateAndSetFiles(files)
    }
  }

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllFiles = () => {
    setSelectedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.upload('/chat/upload', formData)

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      const data = await response.json()
      return data
    } catch (err) {
      console.error('Error uploading file:', err)
      throw err
    } finally {
      setUploading(false)
    }
  }

  // Send all files together
  const sendAllFiles = async () => {
    if (selectedFiles.length === 0) return

    setSending(true)
    try {
      // Upload all files first
      const uploadedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          const uploadData = await uploadFile(file)
          return { file, uploadData }
        })
      )

      // Send each file as a message
      for (const item of uploadedFiles) {
        const mimeType = item.file.type
        let messageType = 'image'
        if (mimeType.startsWith('video/')) {
          messageType = 'video'
        } else if (mimeType === 'application/pdf') {
          messageType = 'document'
        }

        const response = await api.post('/chat/messages/to-lead', {
          leadId: selectedConversation?.leadId,
          channel: selectedConversation?.channel,
          content: item.file.name,
          type: messageType,
          mediaUrl: item.uploadData.url,
          fileName: item.file.name
        })

        if (response.ok) {
          const data = await response.json()
          setMessages(prev => [...prev, data.message])
        }
      }

      clearAllFiles()
    } catch (err) {
      console.error('Error sending files:', err)
      alert('Error al enviar los archivos')
    } finally {
      setSending(false)
    }
  }

  // Open convert to lead modal
  const openConvertModal = () => {
    if (!selectedConversation?.leadId) return
    const lead = leads.find(l => l.id === selectedConversation.leadId)
    setConvertForm({
      name: lead?.name || selectedConversation?.leadName || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      notes: lead?.notes || '',
      status: 'nuevo'
    })
    setShowConvertModal(true)
  }

  // Convert visitor to lead
  const handleConvertToLead = async () => {
    if (!selectedConversation?.leadId) return
    if (!convertForm.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    setConvertingLead(true)
    try {
      const response = await api.put(`/leads/${selectedConversation.leadId}`, {
        name: convertForm.name,
        email: convertForm.email || undefined,
        phone: convertForm.phone || undefined,
        notes: convertForm.notes || undefined,
        status: convertForm.status || 'nuevo',
        channel: selectedConversation?.channel || 'messenger'
      })

      if (response.ok) {
        const data = await response.json()
        // Update lead in local state
        setLeads(prev => prev.map(l => 
          l.id === selectedConversation.leadId 
            ? { ...l, ...data.lead, status: convertForm.status || 'nuevo' }
            : l
        ))
        // Update lead name in conversation
        setConversations(prev => prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, leadName: convertForm.name }
            : c
        ))
        setShowConvertModal(false)
        showToast('success', `Lead "${convertForm.name}" convertido exitosamente`)
        // Reload conversations and leads to update UI
        loadConversations()
        loadLeads()
      } else {
        const error = await response.json()
        alert('Error: ' + (error.message || 'No se pudo convertir'))
      }
    } catch (err) {
      console.error('Error converting lead:', err)
      alert('Error al convertir el lead')
    } finally {
      setConvertingLead(false)
    }
  }

  const handleSendMessage = async () => {
    // Handle files only (no text)
    if (selectedFiles.length > 0 && !newMessage.trim()) {
      await sendAllFiles()
      return
    }

    if ((!newMessage.trim() && !selectedFiles.length) || sending) return

    setSending(true)
    try {
      // Send text message
      const response = await api.post('/chat/messages/to-lead', {
        leadId: selectedConversation?.leadId,
        channel: selectedConversation?.channel,
        content: newMessage.trim(),
        type: 'text'
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        
        // If there are files, send them too
        if (selectedFiles.length > 0) {
          await sendAllFiles()
        }
      }
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Filter conversations by search (using the already filtered list)
  const searchFilteredConversations = filteredConversations.filter(conv => {
    if (!searchQuery) return true
    const leadName = conv?.leadName || ''
    const lastMessage = conv.lastMessage || ''
    return (
      leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.sentAt)
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  const channelConfig = selectedConversation 
    ? CHANNEL_CONFIG[selectedConversation?.channel] || CHANNEL_CONFIG.whatsapp 
    : null

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-4 md:p-6">
      {/* Main container */}
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-7xl h-[calc(100vh-180px)] bg-[#161616] rounded-2xl border border-slate-700/50 overflow-hidden flex">
          
          {/* Left Column - Conversation List */}
          <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-slate-700/50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-white">Bandeja de Entrada</h1>
                <button
                  onClick={() => setShowNewConversation(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-[#22d3ee] hover:bg-cyan-400 text-[#0d0d0d] rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-[#1f1f1f] text-white placeholder-slate-400 rounded-full pl-10 pr-4 py-2.5 outline-none border border-slate-700/50 focus:border-[#22d3ee] transition-colors"
                />
              </div>
            </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-[#22d3ee] animate-spin" />
              </div>
            ) : searchFilteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                {t.noConversations}
              </div>
            ) : (
              <div className="divide-y divide-slate-700/30">
                {searchFilteredConversations.map((conv) => {
                  const isSelected = selectedConversation?.id === conv.id
                  const convChannel = CHANNEL_CONFIG[conv.channel] || CHANNEL_CONFIG.whatsapp
                  const ChannelIcon = convChannel.icon
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`
                        w-full p-4 text-left transition-all hover:bg-slate-800/50
                        ${isSelected ? 'bg-slate-800/70 border-l-2 border-[#22d3ee]' : ''}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar with initials */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {getInitials(conv.leadName)}
                        </div>
                        
                        {/* Channel icon */}
                        <div className={`w-6 h-6 rounded-full ${convChannel.bgColor} flex items-center justify-center flex-shrink-0 -ml-2 z-10`}>
                          <ChannelIcon className={`w-3 h-3 ${convChannel.iconColor}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white truncate">
                              {conv.leadName || 'Lead'}
                            </span>
                            <span className="text-xs text-slate-500 flex-shrink-0">
                              {formatTime(conv.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-slate-400 truncate">
                              {conv.lastMessage || 'Sin mensajes'}
                            </span>
                            {/* Unread badge */}
                            {conv.unreadCount > 0 && (
                              <span className="min-w-[18px] h-[18px] px-1 bg-[#22d3ee] text-[#0d0d0d] text-[10px] font-bold rounded-full flex items-center justify-center">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Chat Area */}
        <div className="hidden md:flex flex-1 flex-col">
          {selectedConversation ? (
            <div className="flex flex-col h-full">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium">
                    {getInitials(selectedConversation?.leadName)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{selectedConversation?.leadName || 'Lead'}</h3>
                    <div className="flex items-center gap-2 text-sm">
                      {channelConfig && (
                        <>
                          <channelConfig.icon className={`w-3 h-3 ${channelConfig.iconColor}`} />
                          <span className="text-slate-400">{channelConfig.label}</span>
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                          <span className="text-emerald-400 text-xs">{t.online}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 relative">
                  {(() => {
                    const lead = leads.find(l => l.id === selectedConversation?.leadId)
                    const isVisitor = lead?.status === 'visitor'
                    return (
                      <>
                        {/* Convert to Lead button for visitors */}
                        {isVisitor && (
                          <button 
                            onClick={openConvertModal}
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg text-sm flex items-center gap-1 transition-colors"
                            title="Convertir a Lead"
                          >
                            <User className="w-4 h-4" />
                            Convertir a Lead
                          </button>
                        )}
                        {selectedConversation?.channel === 'email' && (
                          <>
                            <button 
                              onClick={() => setShowEmailModal(true)}
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-blue-400"
                              title="Enviar email"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setShowAddResponseModal(true)}
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-emerald-400"
                              title="Agregar respuesta del lead"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </>
                    )
                  })()}
                  <button 
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </button>
                  
                  {/* Options Menu */}
                  {showOptionsMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-[#1f1f1f] border border-slate-700 rounded-lg shadow-xl z-20 min-w-[160px]">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true)
                          setShowOptionsMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                  <div className="relative bg-[#1f1f1f] rounded-2xl p-6 border border-slate-700 shadow-2xl max-w-sm">
                    <h3 className="text-xl font-bold text-white mb-4">Eliminar Conversación</h3>
                    <p className="text-slate-400 mb-6">
                      ¿Estás seguro de eliminar la conversación con <span className="text-white font-medium">{selectedConversation?.leadName}</span>? 
                      Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={deleteConversation}
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Convert to Lead Modal */}
              {showConvertModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowConvertModal(false)} />
                  <div className="relative bg-[#1f1f1f] rounded-2xl p-6 border border-slate-700 shadow-2xl max-w-md w-full">
                    <h3 className="text-xl font-bold text-white mb-2">Convertir a Lead</h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Completa los datos del lead para poder gestionarlo en tu CRM.
                    </p>
                    
                    <div className="space-y-4">
                      {/* Platform indicator */}
                      <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                        {selectedConversation?.channel === 'messenger' && (
                          <>
                            <Facebook className="w-5 h-5 text-blue-400" />
                            <span className="text-white">Facebook Messenger</span>
                          </>
                        )}
                        {selectedConversation?.channel === 'whatsapp' && (
                          <>
                            <MessageCircle className="w-5 h-5 text-emerald-400" />
                            <span className="text-white">WhatsApp</span>
                          </>
                        )}
                        {selectedConversation?.channel === 'instagram' && (
                          <>
                            <Instagram className="w-5 h-5 text-pink-400" />
                            <span className="text-white">Instagram DM</span>
                          </>
                        )}
                        {selectedConversation?.channel === 'email' && (
                          <>
                            <Mail className="w-5 h-5 text-blue-300" />
                            <span className="text-white">Email</span>
                          </>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Nombre *</label>
                        <input
                          type="text"
                          value={convertForm.name}
                          onChange={(e) => setConvertForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                          placeholder="Nombre completo"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-400 text-sm mb-1">Email</label>
                          <input
                            type="email"
                            value={convertForm.email}
                            onChange={(e) => setConvertForm(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                            placeholder="email@ejemplo.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-slate-400 text-sm mb-1">Teléfono</label>
                          <input
                            type="tel"
                            value={convertForm.phone}
                            onChange={(e) => setConvertForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                            placeholder="+54 11 1234-5678"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Estado inicial</label>
                        <select
                          value={convertForm.status || 'nuevo'}
                          onChange={(e) => setConvertForm(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="nuevo">Nuevo</option>
                          <option value="contactado">Contactado</option>
                          <option value="respondio">Respondió</option>
                          <option value="visita_agendada">Visita Agendada</option>
                          <option value="visita_realizada">Visita Realizada</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Notas</label>
                        <textarea
                          value={convertForm.notes}
                          onChange={(e) => setConvertForm(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 h-24 resize-none"
                          placeholder="Notas adicionales sobre el lead..."
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowConvertModal(false)}
                        className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        disabled={convertingLead}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConvertToLead}
                        disabled={convertingLead || !convertForm.name.trim()}
                        className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {convertingLead ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Convirtiendo...
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4" />
                            Convertir
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-4 relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Drag & drop overlay */}
                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10 m-4 rounded-2xl border-2 border-dashed border-[#22d3ee]">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-[#22d3ee] mx-auto mb-2" />
                      <p className="text-white font-medium">{t.dragDrop}</p>
                      <p className="text-slate-400 text-sm">{t.maxSize}</p>
                    </div>
                  </div>
                )}

                {messages.length === 0 && emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="w-16 h-16 text-slate-600 mb-4" />
                    <h4 className="text-white font-medium mb-2">{t.noMessages}</h4>
                    <p className="text-slate-400 text-sm max-w-xs">{t.startChat}</p>
                  </div>
                ) : selectedConversation?.channel === 'email' ? (
                  // Email view
                  <div className="space-y-4">
                    {emails.map((email, idx) => {
                      const isOutbound = email.direction === 'sent'
                      return (
                        <div 
                          key={email.id || idx}
                          className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                              isOutbound 
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-br-md'
                                : 'bg-[#1f1f1f] text-white rounded-bl-md'
                            }`}
                          >
                            <div className="text-xs opacity-60 mb-1">
                              {isOutbound ? `Enviado a ${email.to}` : `De ${email.from}`}
                            </div>
                            <div className="font-medium text-sm mb-2">{email.subject}</div>
                            <p className="text-sm whitespace-pre-wrap">{email.body}</p>
                            <div className={`flex items-center gap-1 mt-2 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-xs opacity-60">
                                {new Date(email.createdAt).toLocaleString('es-AR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date}>
                      {/* Date separator */}
                      <div className="flex items-center justify-center mb-4">
                        <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
                          {date}
                        </span>
                      </div>
                      
                      {/* Messages for this date */}
                      <div className="space-y-3">
                        {dateMessages.map((msg, idx) => {
                          const isOutbound = msg.direction === 'outbound'
                          
                          return (
                            <div 
                              key={msg.id || idx}
                              className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                            >
                              <div 
                                className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                                  isOutbound 
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-br-md'
                                    : 'bg-[#1f1f1f] text-white rounded-bl-md'
                                }`}
                              >
                                {/* Media display */}
                                {msg.mediaUrl && (
                                  msg.mediaType === 'video' || msg.type === 'video' ? (
                                    <div className="mb-2">
                                      <video 
                                        src={msg.mediaUrl} 
                                        controls 
                                        className="max-w-full rounded-lg max-h-60"
                                      />
                                    </div>
                                  ) : msg.mediaType === 'document' || msg.type === 'document' ? (
                                    <div className="mb-2 p-3 bg-slate-800/50 rounded-lg flex items-center gap-2">
                                      <FileText className="w-5 h-5 flex-shrink-0 text-slate-400" />
                                      <a 
                                        href={msg.mediaUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm underline truncate text-white"
                                      >
                                        {msg.fileName || msg.content || 'Documento'}
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="mb-2">
                                      <img 
                                        src={msg.mediaUrl} 
                                        alt={msg.content || 'Imagen'} 
                                        className="max-w-full rounded-lg max-h-60"
                                      />
                                    </div>
                                  )
                                )}
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <div className={`flex items-center gap-1 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                  <span className="text-xs opacity-60">{formatTime(msg.sentAt)}</span>
                                  {isOutbound && (
                                    msg.status === 'delivered' || msg.status === 'read' ? (
                                      <CheckCheck className="w-3 h-3 opacity-60" />
                                    ) : (
                                      <Check className="w-3 h-3 opacity-60" />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <div className="px-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">
                      {selectedFiles.length} {selectedFiles.length === 1 ? t.file : t.files} {t.selected}
                    </span>
                    <button
                      onClick={clearAllFiles}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      {t.clearAll}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="p-2 bg-slate-800/50 rounded-lg flex items-center gap-2 max-w-[150px]">
                        <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                          {file.type.startsWith('video/') ? (
                            <Video className="w-4 h-4 text-blue-400" />
                          ) : file.type === 'application/pdf' ? (
                            <FileText className="w-4 h-4 text-red-400" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs truncate">{file.name}</p>
                        </div>
                        <button
                          onClick={() => removeSelectedFile(idx)}
                          className="p-1 hover:bg-slate-600 rounded flex-shrink-0"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input - only show for non-email channels */}
              {selectedConversation?.channel !== 'email' && (
                <div className="p-4 border-t border-slate-700/50">
                  <div className="flex items-end gap-2">
                    {/* Attachment button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,.pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={selectedFiles.length >= 5}
                      className={`p-3 rounded-full transition-all ${
                        selectedFiles.length >= 5 
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                          : 'bg-[#1f1f1f] text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={t.typeMessage}
                        className="w-full bg-[#1f1f1f] text-white placeholder-slate-400 rounded-full px-4 py-3 outline-none border border-slate-700/50 focus:border-[#22d3ee] resize-none"
                        rows={1}
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={(!newMessage.trim() && !selectedFiles.length) || sending}
                      className={`p-3 rounded-full transition-all ${
                        (newMessage.trim() || selectedFiles.length) && !sending
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:scale-105'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              )}
            </div>
            ) : (
              /* No conversation selected */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{t.startConversation}</h3>
                <p className="text-slate-400 max-w-sm">
                  Selecciona una conversación de la lista para comenzar a chatear con tus leads.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* New Conversation Modal - OUTSIDE the main flex container */}
      {showNewConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowNewConversation(false)} />
          
          <div className="relative bg-[#1f1f1f] rounded-2xl w-full max-w-md p-6 border border-slate-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Conversación</h2>
            
            {/* Lead selector */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Seleccionar Lead</label>
              <div className="relative">
                <select
                  value={selectedLead?.id || ''}
                  onChange={(e) => {
                    const lead = leads.find(l => l.id === e.target.value)
                    setSelectedLead(lead || null)
                  }}
                  className="w-full bg-[#161616] text-white rounded-lg px-4 py-3 outline-none border border-slate-700 focus:border-[#22d3ee] appearance-none"
                >
                  <option value="">Selecciona un lead...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} {lead.phone ? `(${lead.phone})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Channel selector */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Canal</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(channel => {
                  const config = CHANNEL_CONFIG[channel]
                  const Icon = config.icon
                  const validation = channelValidation[channel]
                  const isValid = validation?.valid
                  const isInvalid = validation && !validation.valid
                  
                  return (
                    <button
                      key={channel}
                      onClick={() => setSelectedChannel(channel)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm ${
                        selectedChannel === channel
                          ? isInvalid 
                            ? 'border-red-500 bg-red-500/10 text-red-400'
                            : isValid
                              ? 'border-green-500 bg-green-500/10 text-green-400'
                              : 'border-[#22d3ee] bg-[#22d3ee]/10 text-[#22d3ee]'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                      {isValid && <span className="text-xs">✓</span>}
                      {isInvalid && <span className="text-xs">✕</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Validation message */}
            {selectedLead && selectedChannel && channelValidation[selectedChannel] && !channelValidation[selectedChannel].valid && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <span className="text-red-500">⚠</span>
                  {channelValidation[selectedChannel].message}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Editá los datos del lead en la sección de Leads para poder enviar mensajes por {CHANNEL_CONFIG[selectedChannel]?.label}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewConversation(false)
                  setSelectedLead(null)
                  setSelectedChannel('whatsapp')
                }}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createNewConversation}
                disabled={!selectedLead || (channelValidation[selectedChannel] && !channelValidation[selectedChannel].valid)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  selectedLead && (!channelValidation[selectedChannel] || channelValidation[selectedChannel].valid)
                    ? 'bg-[#22d3ee] hover:bg-cyan-400 text-[#0d0d0d]'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEmailModal(false)} />
          
          <div className="relative bg-[#1f1f1f] rounded-2xl w-full max-w-lg p-6 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Nuevo Email</h2>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="p-1 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            {/* Recipient */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Para</label>
              <input
                type="email"
                value={(() => {
                  let email = selectedConversation?.leadEmail || selectedConversation?.lead?.email
                  if (!email && selectedConversation?.leadId) {
                    const lead = leads.find(l => l.id === selectedConversation.leadId)
                    email = lead?.email
                  }
                  return email || ''
                })()}
                disabled
                className="w-full bg-[#161616] text-slate-400 rounded-lg px-4 py-3 border border-slate-700"
              />
            </div>
            
            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Asunto</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Asunto del email..."
                className="w-full bg-[#161616] text-white rounded-lg px-4 py-3 outline-none border border-slate-700 focus:border-[#22d3ee]"
              />
            </div>
            
            {/* Body */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Mensaje</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Escribe tu mensaje..."
                rows={6}
                className="w-full bg-[#161616] text-white rounded-lg px-4 py-3 outline-none border border-slate-700 focus:border-[#22d3ee] resize-none"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!emailSubject.trim() || !emailBody.trim() || sendingEmail}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  emailSubject.trim() && emailBody.trim() && !sendingEmail
                    ? 'bg-[#22d3ee] hover:bg-cyan-400 text-[#0d0d0d]'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {sendingEmail ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4 inline mr-2" />
                    Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Response Modal - for when lead replies to your email */}
      {showAddResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddResponseModal(false)} />
          
          <div className="relative bg-[#1f1f1f] rounded-2xl w-full max-w-lg p-6 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Agregar respuesta del lead</h2>
              <button 
                onClick={() => setShowAddResponseModal(false)}
                className="p-1 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-emerald-400 text-sm">
                📝 Usa esto cuando el lead te respondió por email (en su bandeja de entrada real)
              </p>
              <p className="text-slate-400 text-xs mt-2">
                Ejemplo: El lead abrió tu email y te respondió saying "Me interesa, podemos agendar?"
              </p>
            </div>
            
            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Asunto del email del lead</label>
              <input
                type="text"
                value={responseSubject}
                onChange={(e) => setResponseSubject(e.target.value)}
                placeholder="Re: Interesado en propiedad..."
                className="w-full bg-[#161616] text-white rounded-lg px-4 py-3 outline-none border border-slate-700 focus:border-[#22d3ee]"
              />
            </div>
            
            {/* Body */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Contenido de su respuesta</label>
              <textarea
                value={responseBody}
                onChange={(e) => setResponseBody(e.target.value)}
                placeholder="Escribe lo que el lead te respondió..."
                rows={6}
                className="w-full bg-[#161616] text-white rounded-lg px-4 py-3 outline-none border border-slate-700 focus:border-[#22d3ee] resize-none"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddResponseModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddManualResponse}
                disabled={!responseSubject.trim() || !responseBody.trim()}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  responseSubject.trim() && responseBody.trim()
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Agregar respuesta
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && (
        <ToastNotification 
          type={toast.type} 
          message={toast.message} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}

// Toast Notification Component
function ToastNotification({ type, message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 10000)
    return () => clearTimeout(timer)
  }, [onClose])

  const isSuccess = type === 'success'
  
  return (
    <div 
      className="fixed top-4 right-4 z-[99999] max-w-md w-full mx-4 animate-slide-in"
    >
      <div className={`rounded-xl p-4 shadow-2xl border flex items-center gap-3 ${
        isSuccess 
          ? 'bg-emerald-900/95 border-emerald-600 text-white' 
          : 'bg-red-900/95 border-red-600 text-white'
      }`}>
        {isSuccess ? (
          <User className="w-6 h-6 text-emerald-400 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
        )}
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}