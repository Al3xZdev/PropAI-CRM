import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const NotificationsContext = createContext(null)

// Generate unique IDs
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
  Trash2: '🗑️'
}

export const getIcon = (iconName) => ICONS[iconName] || '📢'

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('notifications')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setNotifications(parsed)
        setUnreadCount(parsed.filter(n => !n.read).length)
      } catch (e) {
        console.error('Error loading notifications:', e)
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications))
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Add notification
  const addNotification = useCallback((type, data = {}) => {
    const template = NOTIFICATION_TYPES[type]
    if (!template) return null

    const notification = {
      id: generateId(),
      type: template.id,
      icon: template.icon,
      color: template.color,
      bgColor: template.bgColor,
      borderColor: template.borderColor,
      title: template.title,
      description: formatDescription(template.description, data),
      data,
      read: false,
      createdAt: new Date().toISOString()
    }

    setNotifications(prev => [notification, ...prev].slice(0, 50)) // Keep max 50
    return notification.id
  }, [])

  // Mark as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length
  }, [notifications])

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
