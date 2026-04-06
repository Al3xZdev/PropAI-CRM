import { useState, useRef, useEffect } from 'react'
import { Bell, X, Check, CheckCheck, Trash2, Clock } from 'lucide-react'
import { useNotifications, getIcon } from '../hooks/useNotifications'

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const panelRef = useRef(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications()

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Pulse animation when there are new notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [notifications.length])

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins}m`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
  }

  const getColorClasses = (notification) => {
    const colors = {
      emerald: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/30',
        icon: 'text-emerald-400',
        bgHover: 'hover:bg-emerald-500/10'
      },
      amber: {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500/30',
        icon: 'text-amber-400',
        bgHover: 'hover:bg-amber-500/10'
      },
      blue: {
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        icon: 'text-blue-400',
        bgHover: 'hover:bg-blue-500/10'
      },
      violet: {
        bg: 'bg-violet-500/20',
        border: 'border-violet-500/30',
        icon: 'text-violet-400',
        bgHover: 'hover:bg-violet-500/10'
      },
      red: {
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        icon: 'text-red-400',
        bgHover: 'hover:bg-red-500/10'
      },
      green: {
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        icon: 'text-green-400',
        bgHover: 'hover:bg-green-500/10'
      }
    }
    return colors[notification.color] || colors.blue
  }

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-3 rounded-xl transition-all duration-300
          ${isOpen ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
          ${isAnimating ? 'animate-wiggle' : ''}
        `}
      >
        <Bell className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-12' : ''}`} />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className={`
            absolute -top-1 -right-1 
            min-w-[20px] h-5 px-1.5
            bg-red-500 text-white text-xs font-bold
            rounded-full flex items-center justify-center
            animate-bounce-in shadow-lg shadow-red-500/50
          `}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="
          absolute right-0 top-full mt-2
          w-96 max-h-[500px]
          bg-slate-800 rounded-2xl 
          border border-slate-700
          shadow-2xl shadow-black/50
          overflow-hidden
          animate-scale-in origin-top-right
          z-50
        ">
          {/* Header */}
          <div className="
            p-4 border-b border-slate-700
            bg-gradient-to-r from-slate-800 to-slate-800/80
          ">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Bell className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-white font-bold">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                      title="Marcar todas como leídas"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={clearAll}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Limpiar todas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center animate-fade-in">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
                  <Bell className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400">No hay notificaciones</p>
                <p className="text-slate-500 text-sm mt-1">Las notificaciones aparecerán aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.map((notification, index) => {
                  const colors = getColorClasses(notification)
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`
                        relative p-4 cursor-pointer
                        transition-all duration-200
                        ${colors.bgHover}
                        animate-fade-in-up
                        ${!notification.read ? 'bg-slate-700/30' : 'opacity-75'}
                      `}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Unread indicator */}
                      {!notification.read && (
                        <span className="
                          absolute left-2 top-1/2 -translate-y-1/2
                          w-2 h-2 bg-blue-500 rounded-full
                          animate-pulse
                        " />
                      )}
                      
                      <div className="flex items-start gap-3 pl-4">
                        {/* Icon */}
                        <div className={`
                          w-10 h-10 rounded-xl
                          ${colors.bg}
                          flex items-center justify-center
                          flex-shrink-0
                        `}>
                          <span className="text-lg">{getIcon(notification.icon)}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-white font-medium text-sm">
                                {notification.title}
                              </h4>
                              <p className="text-slate-400 text-sm mt-0.5">
                                {notification.description}
                              </p>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-slate-500 text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(notification.createdAt)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeNotification(notification.id)
                                }}
                                className="
                                  p-1.5 rounded-lg
                                  text-slate-500 hover:text-red-400
                                  hover:bg-red-500/10
                                  transition-all opacity-0 group-hover:opacity-100
                                "
                                style={{ opacity: 1 }}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hover X button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeNotification(notification.id)
                        }}
                        className="
                          absolute top-2 right-2
                          p-1.5 rounded-lg
                          text-slate-500 hover:text-red-400
                          hover:bg-red-500/10
                          transition-all
                          opacity-0 hover:opacity-100
                          focus:opacity-100
                        "
                        title="Eliminar notificación"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="
              p-3 border-t border-slate-700
              bg-slate-800/50
              text-center
            ">
              <button
                onClick={clearAll}
                className="
                  text-slate-400 hover:text-white
                  text-sm transition-colors
                  flex items-center gap-2 mx-auto
                "
              >
                <Trash2 className="w-4 h-4" />
                Limpiar todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
