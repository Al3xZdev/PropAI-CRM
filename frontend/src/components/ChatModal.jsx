import { useState, useEffect, useRef } from 'react'
import { 
  X, Send, Phone, Mail, MessageCircle, Instagram, 
  Facebook, ArrowLeft, MoreVertical, Image, FileText,
  Check, CheckCheck, Clock, User, Loader2, Paperclip,
  File, Video, ImageIcon, XCircle, Upload, Trash2,
  AlertTriangle
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
})

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

// Format time for messages
const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

// Format date for message groups
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function ChatModal({ isOpen, onClose, lead, onMessageSent }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(lead?.channel || 'whatsapp')
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  
  // File attachment state (up to 5 files)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Load conversation and messages
  useEffect(() => {
    if (isOpen && lead) {
      loadChatData()
    }
  }, [isOpen, lead])

  // Reload messages when channel changes
  useEffect(() => {
    if (isOpen && lead && conversation) {
      loadMessagesForChannel()
    }
  }, [selectedChannel])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-refresh: cargar mensajes cada 5 segundos
  useEffect(() => {
    if (!isOpen || !conversation) return
    
    const interval = setInterval(() => {
      loadMessagesForChannel()
    }, 5000) // 5 segundos
    
    return () => clearInterval(interval)
  }, [isOpen, conversation, selectedChannel])

  // Load messages for specific channel
  const loadMessagesForChannel = async () => {
    if (!conversation) return
    
    setIsSyncing(true)
    try {
      const response = await fetch(`${API_URL}/chat/conversations/${conversation.id}/messages`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        // Filter by selected channel
        const channelMessages = (data.messages || []).filter(
          msg => msg.channel === selectedChannel
        )
        setMessages(channelMessages)
        setLastSync(new Date())
      }
    } catch (err) {
      console.error('Error loading messages for channel:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const loadChatData = async () => {
    setLoading(true)
    try {
      // Use selected channel to get/create conversation
      const convResponse = await fetch(`${API_URL}/chat/conversations/lead/${lead.id}?channel=${selectedChannel}`, {
        headers: getAuthHeaders()
      })
      
      let conv
      if (convResponse.ok) {
        const convData = await convResponse.json()
        conv = convData.conversation
      }

      // If no conversation, try to create one with selected channel
      if (!conv) {
        const createResponse = await fetch(`${API_URL}/chat/conversations`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            leadId: lead.id, 
            channel: selectedChannel
          })
        })

        if (createResponse.ok) {
          const createData = await createResponse.json()
          conv = createData.conversation
        }
      }

      setConversation(conv)

      // Get messages - filter by channel
      if (conv) {
        const messagesResponse = await fetch(`${API_URL}/chat/conversations/${conv.id}/messages`, {
          headers: getAuthHeaders()
        })
        
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json()
          // Filter messages by selected channel
          const channelMessages = (messagesData.messages || []).filter(
            msg => msg.channel === selectedChannel
          )
          setMessages(channelMessages)
        }
      }

      // If no messages from chat, use lead's followUps for this channel
      if (!conv || messages.length === 0) {
        const followUps = lead.followUps || []
        if (followUps.length > 0) {
          // Migrate followUps to chat
          await migrateFollowUps(followUps)
        }
      }

    } catch (err) {
      console.error('Error loading chat:', err)
    } finally {
      setLoading(false)
    }
  }

  const migrateFollowUps = async (followUps) => {
    try {
      // Use selected channel for migration
      const channelToUse = followUps.some(f => f.channel === selectedChannel) 
        ? selectedChannel 
        : (followUps[0]?.channel || selectedChannel)
      
      const response = await fetch(`${API_URL}/chat/migrate/followups`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          leadId: lead.id,
          followUps,
          channel: channelToUse
        })
      })

      if (response.ok) {
        const data = await response.json()
        setConversation(data.conversation)
        
        // Reload messages filtered by channel
        if (data.conversation) {
          const messagesResponse = await fetch(`${API_URL}/chat/conversations/${data.conversation.id}/messages`, {
            headers: getAuthHeaders()
          })
          
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json()
            // Filter by selected channel
            const channelMessages = (messagesData.messages || []).filter(
              msg => msg.channel === selectedChannel
            )
            setMessages(channelMessages)
          }
        }
      }
    } catch (err) {
      console.error('Error migrating followUps:', err)
    }
  }

  // File handling functions (up to 5 files)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      validateAndSetFiles(files)
    }
  }

  const validateAndSetFiles = (files) => {
    // Max 5 files
    if (selectedFiles.length + files.length > 5) {
      alert('Máximo 5 archivos permitidos.')
      return
    }

    // Max size: 16MB per file for WhatsApp
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

      const response = await fetch(`${API_URL}/chat/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
        },
        body: formData
      })

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

  // Send all files together (up to 5)
  const sendAllFiles = async () => {
    if (selectedFiles.length === 0) return

    setSending(true)
    try {
      // Upload all files first
      const uploadedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          const uploadData = await uploadFile(file)
          return {
            file,
            uploadData,
            mimeType: file.type
          }
        })
      )

      // If channel is WhatsApp, send all via WhatsApp API
      if (selectedChannel === 'whatsapp' && lead?.phone) {
        for (const item of uploadedFiles) {
          const mimeType = item.file.type
          let messageType = 'image'
          if (mimeType.startsWith('video/')) {
            messageType = 'video'
          } else if (mimeType === 'application/pdf') {
            messageType = 'document'
          }

          try {
            const whatsappResponse = await fetch(`${API_URL}/chat/send/whatsapp/media`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                phoneNumber: lead.phone,
                mediaUrl: item.uploadData.url,
                mediaType: messageType,
                caption: item.file.name,
                leadId: lead.id
              })
            })

            if (whatsappResponse.ok) {
              const waData = await whatsappResponse.json()
              
              // Add to UI
              setMessages(prev => [...prev, {
                id: waData.messageId || Date.now().toString() + Math.random(),
                direction: 'outbound',
                channel: 'whatsapp',
                content: item.file.name,
                mediaUrl: item.uploadData.url,
                mediaType: messageType,
                fileName: item.file.name,
                sentAt: new Date().toISOString(),
                status: 'sent'
              }])
            }
          } catch (waErr) {
            console.error('WhatsApp media send error:', waErr)
          }
        }
      } else {
        // Fallback: save locally
        for (const item of uploadedFiles) {
          const mimeType = item.file.type
          const response = await fetch(`${API_URL}/chat/messages/to-lead`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              leadId: lead.id,
              channel: selectedChannel,
              content: item.file.name,
              type: mimeType.startsWith('video/') ? 'video' : (mimeType === 'application/pdf' ? 'document' : 'image'),
              mediaUrl: item.uploadData.url,
              fileName: item.file.name
            })
          })

          if (response.ok) {
            const data = await response.json()
            setMessages(prev => [...prev, data.message])
          }
        }
      }

      clearAllFiles()
      onMessageSent?.()
    } catch (err) {
      console.error('Error sending files:', err)
      alert('Error al enviar los archivos')
    } finally {
      setSending(false)
    }
  }

  const sendFileMessage = async (file, caption = '') => {
    setSending(true)
    try {
      let fileSent = false

      // If channel is WhatsApp, send via WhatsApp API
      if (selectedChannel === 'whatsapp' && lead?.phone) {
        // First upload to get URL
        const uploadData = await uploadFile(file)
        
        // Determine message type based on MIME
        const mimeType = file.type
        let messageType = 'image'
        if (mimeType.startsWith('video/')) {
          messageType = 'video'
        } else if (mimeType === 'application/pdf') {
          messageType = 'document'
        }

        try {
          const whatsappResponse = await fetch(`${API_URL}/chat/send/whatsapp/media`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              phoneNumber: lead.phone,
              mediaUrl: uploadData.url,
              mediaType: messageType,
              caption: caption || file.name,
              leadId: lead.id
            })
          })

          if (whatsappResponse.ok) {
            const waData = await whatsappResponse.json()
            console.log('✅ WhatsApp media sent:', waData)
            fileSent = true

            // Add to UI
            setMessages(prev => [...prev, {
              id: waData.messageId || Date.now().toString(),
              direction: 'outbound',
              channel: 'whatsapp',
              content: caption || file.name,
              mediaUrl: uploadData.url,
              mediaType: messageType,
              fileName: file.name,
              sentAt: new Date().toISOString(),
              status: 'sent'
            }])
            onMessageSent?.(waData)
          }
        } catch (waErr) {
          console.error('WhatsApp media send error:', waErr)
        }
      }

      // Fallback: save locally if WhatsApp didn't work
      if (!fileSent) {
        const uploadData = await uploadFile(file)
        
        const response = await fetch(`${API_URL}/chat/messages/to-lead`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            leadId: lead.id,
            channel: selectedChannel,
            content: caption || file.name,
            type: file.type.startsWith('video/') ? 'video' : (file.type === 'application/pdf' ? 'document' : 'image'),
            mediaUrl: uploadData.url,
            fileName: file.name
          })
        })

        if (response.ok) {
          const data = await response.json()
          setMessages(prev => [...prev, data.message])
          onMessageSent?.(data.message)
        }
      }

      removeSelectedFile()
    } catch (err) {
      console.error('Error sending file:', err)
      alert('Error al enviar el archivo')
    } finally {
      setSending(false)
    }
  }

  const handleSendMessage = async () => {
    // Handle files only (no text) - send all files together
    if (selectedFiles.length > 0 && !newMessage.trim()) {
      await sendAllFiles()
      return
    }

    // Handle text + files: send text first, then files
    if ((!newMessage.trim() && !selectedFiles.length) || sending) return

    setSending(true)
    try {
      let messageSent = false
      
      // If channel is WhatsApp, try to send via WhatsApp API
      if (selectedChannel === 'whatsapp' && lead?.phone) {
        try {
          const whatsappResponse = await fetch(`${API_URL}/chat/send/whatsapp`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              phoneNumber: lead.phone,
              message: newMessage.trim(),
              leadId: lead.id
            })
          })
          
          if (whatsappResponse.ok) {
            const waData = await whatsappResponse.json()
            console.log('✅ WhatsApp message sent:', waData)
            messageSent = true
            
            // Add to UI immediately
            setMessages(prev => [...prev, {
              id: waData.messageId || Date.now().toString(),
              direction: 'outbound',
              channel: 'whatsapp',
              content: newMessage.trim(),
              sentAt: new Date().toISOString(),
              status: 'sent'
            }])
            setNewMessage('')
            onMessageSent?.(waData)
          } else {
            const waError = await whatsappResponse.json()
            console.error('WhatsApp API error:', waError)
          }
        } catch (waErr) {
          console.error('WhatsApp send error:', waErr)
        }
      }
      
      // Fallback: save locally if WhatsApp didn't work or wasn't selected
      if (!messageSent) {
        const response = await fetch(`${API_URL}/chat/messages/to-lead`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            leadId: lead.id,
            channel: selectedChannel,
            content: newMessage.trim(),
            type: 'text'
          })
        })

        if (response.ok) {
          const data = await response.json()
          
          // Add new message to list
          setMessages(prev => [...prev, data.message])
          setNewMessage('')
          
          // Callback if needed
          onMessageSent?.(data.message)
        } else {
          const error = await response.json()
          console.error('Error sending message:', error)
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

  // Clear conversation history
  const handleClearConversation = async () => {
    if (!conversation) return
    
    try {
      const response = await fetch(`${API_URL}/chat/conversations/${conversation.id}/messages`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        setMessages([])
        setShowClearConfirm(false)
      }
    } catch (err) {
      console.error('Error clearing conversation:', err)
      alert('Error al limpiar la conversación')
    }
  }

  if (!isOpen) return null

  const channelConfig = CHANNEL_CONFIG[selectedChannel] || CHANNEL_CONFIG.whatsapp
  const ChannelIcon = channelConfig.icon

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.sentAt)
    if (!groups[date]) groups[date] = []
    groups[date].push(msg)
    return groups
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 rounded-2xl w-full max-w-2xl h-[80vh] overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{lead?.name}</h3>
              <div className="flex items-center gap-1">
                <ChannelIcon className={`w-3 h-3 ${channelConfig.iconColor}`} />
                <span className="text-slate-400 text-xs">{channelConfig.label}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Channel selector */}
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="bg-slate-700 text-white text-xs px-2 py-1 rounded-lg border border-slate-600 outline-none"
            >
              {CHANNELS.map(ch => (
                <option key={ch} value={ch}>{CHANNEL_CONFIG[ch].label}</option>
              ))}
            </select>
            
            {/* Sync indicator */}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              {isSyncing ? (
                <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              ) : lastSync ? (
                <span className="text-emerald-400">✓</span>
              ) : null}
            </div>
            
            {/* Menu with clear option */}
            <div className="relative">
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="p-2 hover:bg-slate-700 rounded-lg"
                title="Limpiar conversación"
              >
                <Trash2 className="w-5 h-5 text-slate-400 hover:text-red-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-16 h-16 text-slate-600 mb-4" />
              <h4 className="text-white font-medium mb-2">Sin mensajes aún</h4>
              <p className="text-slate-400 text-sm max-w-xs">
                Este es el inicio de la conversación. Envía un mensaje para comenzar.
              </p>
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
                    const msgChannelConfig = CHANNEL_CONFIG[msg.channel] || CHANNEL_CONFIG.whatsapp
                    const isMedia = msg.mediaType || msg.type === 'image' || msg.type === 'video' || msg.type === 'document'
                    
                    return (
                      <div 
                        key={msg.id || idx}
                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                            isOutbound 
                              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-md'
                              : 'bg-slate-700 text-slate-100 rounded-bl-md'
                          }`}
                        >
                          {/* Media attachment display */}
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
                                <FileText className="w-5 h-5 flex-shrink-0" />
                                <a 
                                  href={msg.mediaUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm underline truncate"
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

        {/* Message Input */}
        <div 
          className={`p-4 border-t border-slate-700 bg-slate-800/50 ${isDragging ? 'bg-violet-500/10 border-violet-500' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag & drop overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10 m-4 rounded-2xl border-2 border-dashed border-violet-500">
              <div className="text-center">
                <Upload className="w-12 h-12 text-violet-400 mx-auto mb-2" />
                <p className="text-white font-medium">Suelta el archivo aquí</p>
                <p className="text-slate-400 text-sm">Imágenes, videos o PDF hasta 16MB (máx 5)</p>
              </div>
            </div>
          )}

          {/* Selected files preview (up to 5) */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''} seleccionado{selectedFiles.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearAllFiles}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Limpiar todo
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="p-2 bg-slate-700/50 rounded-lg flex items-center gap-2 max-w-[200px]">
                    <div className="w-8 h-8 bg-slate-600 rounded flex items-center justify-center flex-shrink-0">
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
                      <p className="text-slate-400 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={() => removeSelectedFile(idx)}
                      className="p-1 hover:bg-slate-600 rounded flex-shrink-0"
                    >
                      <XCircle className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
              }`}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe un mensaje..."
                className="w-full bg-slate-700 text-white placeholder-slate-400 rounded-2xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !selectedFiles.length) || sending}
              className={`p-3 rounded-full transition-all ${
                (newMessage.trim() || selectedFiles.length) && !sending
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:scale-105'
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
          
          {/* Lead info footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              {lead?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {lead.phone}
                </span>
              )}
              {lead?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {lead.email}
                </span>
              )}
            </div>
            {lead?.propertyTitle && (
              <span className="text-xs text-slate-500">
                Interesado en: {lead.propertyTitle}
              </span>
            )}
          </div>
        </div>

        {/* Clear conversation confirmation modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="bg-slate-800 rounded-xl p-6 max-w-sm mx-4 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Limpiar conversación</h4>
                  <p className="text-slate-400 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-6">
                ¿Estás seguro de que querés borrar todo el historial de mensajes de esta conversación?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClearConversation}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Sí, borrar todo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}