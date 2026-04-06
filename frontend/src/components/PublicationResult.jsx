import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Instagram, Loader2 } from 'lucide-react'

// CSS keyframes as a style tag
const StyleSheet = () => (
  <style>{`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
    
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    @keyframes pop-in {
      0% { transform: scale(0.75); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes pop-out {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0; }
    }
    
    .publication-popup-enter {
      animation: pop-in 0.3s ease-out forwards;
    }
    
    .publication-popup-exit {
      animation: pop-out 0.3s ease-in forwards;
    }
    
    .publication-shake {
      animation: shake 0.5s ease-in-out;
    }
    
    .publication-progress {
      animation: shrink 10s linear forwards;
    }
  `}</style>
)

export default function PublicationResult({ 
  isOpen, 
  status, // 'success' | 'error' | 'loading'
  onClose,
  platform = 'Instagram'
}) {
  const [visible, setVisible] = useState(false)
  const [animationClass, setAnimationClass] = useState('')
  
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setAnimationClass('publication-popup-enter')
      
    // Auto close after success/error (not loading) - 10 seconds
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => {
        handleClose()
      }, 10000)
      return () => clearTimeout(timer)
    }
    }
  }, [isOpen, status])
  
  const handleClose = () => {
    setAnimationClass('publication-popup-exit')
    setTimeout(() => {
      setVisible(false)
      setAnimationClass('')
      onClose?.()
    }, 300)
  }
  
  if (!visible) return null
  
  const config = {
    success: {
      icon: CheckCircle2,
      title: '¡Publicado con éxito!',
      subtitle: `Tu publicación se envió a ${platform}`,
      emoji: '🎉'
    },
    error: {
      icon: XCircle,
      title: 'Error al publicar',
      subtitle: 'Revisá tu conexión e intentá de nuevo',
      emoji: '😔'
    },
    loading: {
      icon: Loader2,
      title: 'Publicando...',
      subtitle: `Enviando a ${platform}`,
      emoji: '📤'
    }
  }
  
  const { icon: Icon, title, subtitle, emoji } = config[status]
  
  return (
    <>
      <StyleSheet />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop with blur */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={handleClose}
        />
        
        {/* Popup */}
        <div className={`relative ${animationClass}`}>
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 min-w-80 text-center">
            
            {/* Success Animation */}
            {status === 'success' && (
              <div className="mb-6">
                <div className="relative inline-block">
                  {/* Checkmark circle with bounce */}
                  <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="w-14 h-14 text-emerald-400" />
                  </div>
                  {/* Confetti particles */}
                  <div className="absolute -top-2 -left-2 w-5 h-5 bg-yellow-400 rounded-full animate-ping opacity-75" />
                  <div className="absolute -top-1 -right-4 w-4 h-4 bg-pink-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.1s' }} />
                  <div className="absolute -bottom-1 -left-5 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.2s' }} />
                  <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-emerald-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
            
            {/* Error Animation */}
            {status === 'error' && (
              <div className="mb-6">
                <div className="relative inline-block publication-shake">
                  <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-14 h-14 text-red-400" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading Animation */}
            {status === 'loading' && (
              <div className="mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Loader2 className="w-14 h-14 text-blue-400 animate-spin" />
                  </div>
                  {/* Orbiting dot */}
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1s' }}>
                    <div className="absolute top-0 left-1/2 w-4 h-4 bg-blue-400 rounded-full transform -translate-x-1/2" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Emoji and Text */}
            <div className="text-5xl mb-4">{emoji}</div>
            <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400">{subtitle}</p>
            
            {/* Platform Badge */}
            {status === 'success' && (
              <div className="mt-6 flex justify-center">
                <div className="flex items-center gap-2 bg-slate-700/50 rounded-full px-5 py-2">
                  <Instagram className="w-5 h-5 text-pink-400" />
                  <span className="text-white font-medium">{platform}</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            )}
            
            {/* Buttons */}
            {status !== 'loading' && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
                >
                  Cerrar
                </button>
                {status === 'error' && (
                  <button
                    onClick={() => {
                      handleClose()
                    }}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium transition-colors"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            )}
            
            {/* Progress bar for auto-close */}
            {status === 'success' && (
              <div className="mt-4 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 publication-progress" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
