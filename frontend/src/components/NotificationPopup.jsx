import { useEffect } from 'react'
import { Bell, X } from 'lucide-react'

export default function NotificationPopup({ notification, onClose }) {
  if (!notification) return null

  // Auto-close after 5 seconds (handled by parent)

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-slate-800 border border-emerald-500/50 rounded-xl p-4 shadow-2xl shadow-emerald-500/20 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg">
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold text-sm">{notification.title}</h4>
            <p className="text-slate-400 text-xs mt-1">{notification.description}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}