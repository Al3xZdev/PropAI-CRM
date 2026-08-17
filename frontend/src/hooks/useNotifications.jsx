import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { api } from '../utils/api'

const NotificationsContext = createContext(null)

// Generate unique IDs (local/optimistic notifications only)
const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Notification types with icons and colors
export const NOTIFICATION_TYPES = {
  // Lead notifications
  LEAD_RESPONDED: {
    id: 'lead_responded',
    type: 'lead_responded',
    icon: 'MessageCircle',
    color: 'emerald',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    title: 'Lead respondió',
    description: '{name} cambió a "Respondió"'
  },
  LEAD_WITHOUT_FOLLOWUP: {
    id: 'lead_without_followup',
    type: 'lead_without_followup',
    icon: 'Clock',
    color: 'amber',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    title: 'Lead sin seguimiento',
    description: '{name} lleva {days} días sin contacto'
  },
  NEW_LEAD: {
    id: 'new_lead',
    type: 'new_lead',
    icon: 'UserPlus',
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    title: 'Nuevo lead',
    description: '{name} fue agregado desde {source}'
  },
  
  // Publication notifications
  POST_SCHEDULED: {
    id: 'post_scheduled',
    type: 'post_scheduled',
    icon: 'Calendar',
    color: 'violet',
    bgColor: 'bg-violet-500/20',
    borderColor: 'border-violet-500/30',
    title: 'Post programado',
    description: 'Publicado en {platform} para el {date}'
  },
  POST_PUBLISHED: {
    id: 'post_published',
    type: 'post_published',
    icon: 'Send',
    color: 'green',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    title: 'Post publicado',
    description: 'Publicado exitosamente en {platform}'
  },
  POST_ERROR: {
    id: 'post_error',
    type: 'post_error',
    icon: 'AlertCircle',
    color: 'red',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    title: 'Error de publicación',
    description: 'No se pudo publicar en {platform}'
  },
  
  // Automation notifications
  MESSAGE_SENT: {
    id: 'message_sent',
    type: 'message_sent',
    icon: 'CheckCircle',
    color: 'emerald',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    title: 'Mensaje enviado',
    description: 'Follow-up día {day} enviado a {name}'
  },
  SEQUENCE_COMPLETED: {
    id: 'sequence_completed',
    type: 'sequence_completed',
    icon: 'Zap',
    color: 'violet',
    bgColor: 'bg-violet-500/20',
    borderColor: 'border-violet-500/30',
    title: 'Secuencia completada',
    description: '{name} completó la secuencia de 14 días'
  },
  AUTOMATION_PAUSED: {
    id: 'automation_paused',
    type: 'automation_paused',
    icon: 'Pause',
    color: 'amber',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    title: 'Automation pausado',
    description: 'Seguimiento de {name} fue pausado'
  },
  AUTOMATION_RESUMED: {
    id: 'automation_resumed',
    type: 'automation_resumed',
    icon: 'Play',
    color: 'emerald',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    title: 'Automation reanudado',
    description: 'Seguimiento de {name} fue reanudado'
  },

  // Chat notifications (incoming WhatsApp / Instagram / Messenger)
  CHAT_MESSAGE: {
    id: 'chat_message',
    type: 'chat_message',
    icon: 'MessageCircle',
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    title: 'Nuevo mensaje',
    description: '{description}'
  },

  // Commission notifications
  COMMISSION_PENDING: {
    id: 'commission_pending',
    type: 'commission_pending',
    icon: 'BadgeDollarSign',
    color: 'amber',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    title: 'Nueva comisión pendiente',
    description: '{description}'
  },
  COMMISSION_OVERDUE: {
    id: 'commission_overdue',
    type: 'commission_overdue',
    icon: 'DollarSign',
    color: 'red',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    title: 'Comisiones vencidas',
    description: '{description}'
  },

  // Follow-up notifications
  FOLLOWUP_DUE: {
    id: 'followup_due',
    type: 'followup_due',
    icon: 'AlarmClock',
    color: 'amber',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    title: 'Tarea',
    description: '{description}'
  }
}

// Icons mapping
const ICONS = {
  MessageCircle: '💬',
  Clock: '⏰',
  UserPlus: '👤',
  Calendar: '📅',
  Send: '📤',
  AlertCircle: '⚠️',
  CheckCircle: '✅',
  Zap: '⚡',
  Pause: '⏸️',
  Play: '▶️',
  Bell: '🔔',
  Trash2: '🗑️',
  DollarSign: '💰',
  BadgeDollarSign: '💰',
  AlarmClock: '⏰'
}

export const getIcon = (iconName) => ICONS[iconName] || '📢'

// Lookup templates by notification.type (for notifications loaded from the API)
const TEMPLATES_BY_TYPE = Object.values(NOTIFICATION_TYPES).reduce((acc, tpl) => {
  acc[tpl.type] = tpl
  return acc
}, {})

// Enrich a backend notification with icon/color so the bell can render it
const mapApiNotification = (n) => {
  const tpl = TEMPLATES_BY_TYPE[n.type]
  return {
    ...n,
    description: n.description || '',
    icon: tpl ? tpl.icon : 'Bell',
    color: tpl ? tpl.color : 'blue',
    bgColor: tpl ? tpl.bgColor : 'bg-blue-500/20',
    borderColor: tpl ? tpl.borderColor : 'border-blue-500/30'
  }
}

const POLL_INTERVAL = 15000

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  // Fetch from the real API (only when there is an authenticated session)
  useEffect(() => {
    let active = true

    const fetchNotifications = async () => {
      if (!localStorage.getItem('user')) {
        setNotifications([])
        return
      }
      try {
        const res = await api.get('/notifications')
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        setNotifications((data.notifications || []).map(mapApiNotification))
      } catch (err) {
        console.error('Error fetching notifications:', err)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  // Add notification (local/optimistic fallback — the backend is the source of truth)
  const addNotification = useCallback((type, data = {}) => {
    let template = null
    if (typeof type === 'string') {
      template = NOTIFICATION_TYPES[type]
    } else if (type && typeof type === 'object' && type.id) {
      template = NOTIFICATION_TYPES[type.id]
    }
    if (!template) return null

    const notification = {
      id: generateId(),
      type: template.id,
      icon: template.icon,
      color: template.color,
      bgColor: template.bgColor,
      borderColor: template.borderColor,
      title: data.title || template.title,
      description: data.description || formatDescription(template.description, data),
      data,
      read: false,
      createdAt: new Date().toISOString()
    }

    setNotifications(prev => [notification, ...prev].slice(0, 50)) // Keep max 50
    return notification.id
  }, [])

  // Mark as read (optimistic + API)
  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ))
    api.put(`/notifications/${id}/read`, {}).catch(err => {
      console.error('Error marking notification as read:', err)
    })
  }, [])

  // Mark all as read (optimistic + API)
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    api.put('/notifications/read-all', {}).catch(err => {
      console.error('Error marking all notifications as read:', err)
    })
  }, [])

  // Remove notification (optimistic + API)
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    api.delete(`/notifications/${id}`).catch(err => {
      console.error('Error removing notification:', err)
    })
  }, [])

  // Clear all notifications (optimistic + API)
  const clearAll = useCallback(() => {
    setNotifications([])
    api.delete('/notifications/clear-all').catch(err => {
      console.error('Error clearing notifications:', err)
    })
  }, [])

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length
  }, [notifications])

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  )

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getUnreadCount
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return context
}

// Helper to format description with data
function formatDescription(template, data) {
  let result = template
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

export default NotificationsContext
