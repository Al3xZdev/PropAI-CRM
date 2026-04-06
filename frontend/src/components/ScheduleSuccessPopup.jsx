import { useState, useEffect } from 'react'
import { CheckCircle2, Calendar, Clock, Instagram, Facebook, Globe, X } from 'lucide-react'

const StyleSheet = () => (
  <style>{`
    @keyframes pop-in {
      0% { transform: scale(0.75); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes pop-out {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0; }
    }
    
    .schedule-popup-enter {
      animation: pop-in 0.3s ease-out forwards;
    }
    
    .schedule-popup-exit {
      animation: pop-out 0.3s ease-in forwards;
    }
    
    @keyframes check-bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    
    .check-bounce {
      animation: check-bounce 0.5s ease-in-out;
    }
    
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    .schedule-progress {
      animation: shrink 10s linear forwards;
    }
  `}</style>
)

const getPlatformIcon = (platform) => {
  const icons = {
    instagram: <Instagram className="w-4 h-4 text-pink-400" />,
    facebook: <Facebook className="w-4 h-4 text-blue-400" />,
    portal: <Globe className="w-4 h-4 text-emerald-400" />
  }
  return icons[platform] || <Globe className="w-4 h-4 text-slate-400" />
}

export default function ScheduleSuccessPopup({ isOpen, onClose, data }) {
  const [visible, setVisible] = useState(false)
  const [animationClass, setAnimationClass] = useState('')
  
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setAnimationClass('schedule-popup-enter')
      
      // Auto close after 10 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])
  
  const handleClose = () => {
    setAnimationClass('schedule-popup-exit')
    setTimeout(() => {
      setVisible(false)
      setAnimationClass('')
      onClose?.()
    }, 300)
  }
  
  if (!visible) return null
  
  return (
    <>
      <StyleSheet />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />
        
        {/* Popup */}
        <div className={`relative ${animationClass}`}>
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 min-w-80 text-center">
            
            {/* Success Animation */}
            <div className="mb-6">
              <div className="relative inline-block">
                {/* Checkmark circle with bounce */}
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center check-bounce">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                {/* Confetti particles */}
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />
                <div className="absolute -top-1 -right-4 w-3 h-3 bg-pink-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.1s' }} />
                <div className="absolute -bottom-1 -left-5 w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.2s' }} />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
            
            {/* Title */}
            <h3 className="text-2xl font-bold text-white mb-2">¡Programado!</h3>
            <p className="text-slate-400 mb-6">Tu publicación se guardó exitosamente</p>
            
            {/* Schedule Details */}
            <div className="bg-slate-700/50 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="text-white">{data?.date || 'Fecha'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-white">{data?.time || 'Hora'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-emerald-400" />
                <div className="flex gap-2">
                  {data?.platforms?.map((platform, idx) => (
                    <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-slate-600 rounded text-sm text-white">
                      {getPlatformIcon(platform)}
                      <span className="capitalize">{platform}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors"
            >
              ¡Entendido!
            </button>
            
            {/* Progress bar */}
            <div className="mt-4 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 schedule-progress" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
