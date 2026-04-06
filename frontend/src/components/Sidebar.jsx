import { useState } from 'react'
import { 
  LayoutDashboard, Building2, Users, 
  Zap, History, ChevronRight, Home,
  LogOut, User, X
} from 'lucide-react'

const Sidebar = ({ currentPage, onNavigate, stats, user, onLogout }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Propiedades', icon: Building2 },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'history', label: 'Historial', icon: History }
  ]

  const { leads = {}, properties = 0 } = stats || {}

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = () => {
    onLogout()
    setShowLogoutModal(false)
  }

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 z-40 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">RealEstate AI</h1>
              <p className="text-slate-500 text-xs">CRM + Marketing</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-grow">
          {menuItems.map(item => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            )
          })}
        </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-3">
            {user?.google_picture ? (
              <img 
                src={user.google_picture} 
                alt={user?.name || 'Usuario'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="flex-grow min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.name || user?.email?.split('@')[0] || 'Usuario'}
              </p>
              <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>

        {/* Stats Summary */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-3">Resumen Rápido</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm">Leads totales</span>
                <span className="text-emerald-400 font-semibold">{leads.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm">Nuevos</span>
                <span className="text-blue-400 font-semibold">{leads.nuevos || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm">Respondieron</span>
                <span className="text-violet-400 font-semibold">{leads.respondieron || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-sm">Propiedades</span>
                <span className="text-amber-400 font-semibold">{properties}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Cerrar Sesión</h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-300 mb-6">
              ¿Estás seguro de que querés cerrar sesión? Vas a necesitar iniciar sesión de nuevo para acceder al sistema.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
