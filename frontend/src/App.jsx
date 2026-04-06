import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import LeadsPage from './pages/LeadsPage'
import AutomationPage from './pages/AutomationPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import PropertyForm from './components/PropertyForm'
import ScheduleTimeline from './components/ScheduleTimeline'
import SocialPreview from './components/SocialPreview'
import PropertyCard from './components/PropertyCard'
import ContentCard from './components/ContentCard'
import PublicationPanel from './components/PublicationPanel'
import PublicationResult from './components/PublicationResult'
import ScheduleModal from './components/ScheduleModal'
import CopywritingContent from './components/CopywritingContent'
import ScheduleSuccessPopup from './components/ScheduleSuccessPopup'
import { NotificationsProvider, useNotifications, NOTIFICATION_TYPES } from './hooks/useNotifications'
import { 
  Sparkles, Building2, FileText, Calendar, Eye, 
  Plus, Loader2, X, Copy, Send, ArrowLeft
} from 'lucide-react'

// API URL - uses relative path for Vercel deployment
const API_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const { addNotification } = useNotifications()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [content, setContent] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [leadsStats, setLeadsStats] = useState({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('portal')
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Publication result modal (global)
  const [showResult, setShowResult] = useState(false)
  const [resultStatus, setResultStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [resultPlatform, setResultPlatform] = useState('Instagram')
  
  // Schedule modal (for manual scheduling)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  
  // Schedule success popup
  const [showScheduleSuccess, setShowScheduleSuccess] = useState(false)
  const [scheduleSuccessData, setScheduleSuccessData] = useState({ date: '', time: '', platforms: [] })

  // Check for existing auth on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser) {
      try {
        // Verify token is still valid
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const apiUser = await response.json()
          // Merge API user data with stored data (to preserve google_picture)
          const stored = JSON.parse(storedUser)
          const mergedUser = { ...stored, ...apiUser.user }
          setUser(mergedUser)
          localStorage.setItem('user', JSON.stringify(mergedUser))
          loadProperties(token)
          loadLeadsStats(token)
        } else {
          // Token invalid, clear storage
          logout()
        }
      } catch (err) {
        logout()
      }
    }
    
    setIsLoading(false)
  }

  const handleLogin = (userData) => {
    setUser(userData)
    loadProperties()
    loadLeadsStats()
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    setProperties([])
    setSelectedProperty(null)
    setContent(null)
    setSchedule(null)
    setLeadsStats({})
  }

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const loadProperties = async (token) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : getAuthHeaders()
      const response = await fetch(`${API_URL}/properties`, { headers })
      if (response.ok) {
        const data = await response.json()
        setProperties(data.properties || [])
      } else if (response.status === 401) {
        logout()
      }
    } catch (err) {
      console.error('Error loading properties:', err)
    }
  }

  const loadLeadsStats = async (token) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : getAuthHeaders()
      const response = await fetch(`${API_URL}/leads/stats/summary`, { headers })
      if (response.ok) {
        const data = await response.json()
        setLeadsStats(data)
      } else if (response.status === 401) {
        logout()
      }
    } catch (err) {
      console.error('Error loading leads stats:', err)
    }
  }

  const handleNavigate = (page) => {
    setCurrentPage(page)
  }

  const handlePropertySubmit = async (formData) => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const propertyFormData = new FormData()
      propertyFormData.append('title', formData.title)
      propertyFormData.append('address', formData.address)
      propertyFormData.append('price', formData.price)
      propertyFormData.append('area', formData.area)
      propertyFormData.append('bedrooms', formData.bedrooms)
      propertyFormData.append('bathrooms', formData.bathrooms)
      propertyFormData.append('description', formData.description || '')
      propertyFormData.append('propertyType', formData.propertyType)
      propertyFormData.append('features', JSON.stringify(formData.features || []))
      if (formData.yearBuilt) propertyFormData.append('yearBuilt', formData.yearBuilt)
      if (formData.floors) propertyFormData.append('floors', formData.floors)
      
      formData.images.forEach(file => {
        propertyFormData.append('images', file)
      })

      const propertyResponse = await fetch(`${API_URL}/properties`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: propertyFormData
      })
      
      if (!propertyResponse.ok) {
        const errorData = await propertyResponse.json()
        throw new Error(errorData.error || 'Error al subir la propiedad')
      }
      
      const propertyResult = await propertyResponse.json()
      setSelectedProperty(propertyResult.property)

      // Generate content
      const contentResult = await generateContent(propertyResult.property)
      setContent(contentResult.content)

      // Generate schedule
      const scheduleResult = await generateSchedule(propertyResult.property, contentResult.content)
      setSchedule({
        ...scheduleResult.schedule,
        id: scheduleResult.scheduleId
      })

      await loadProperties()
      setCurrentPage('content')
      setActiveTab('portal')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateContent = async (property) => {
    const response = await fetch(`${API_URL}/content/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ property })
    })
    if (!response.ok) throw new Error('Error al generar contenido')
    return response.json()
  }

  const generateSchedule = async (property, content) => {
    const response = await fetch(`${API_URL}/schedule/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ property, content })
    })
    if (!response.ok) throw new Error('Error al generar calendario')
    return response.json()
  }

  const handleSelectProperty = async (propertyId) => {
    setIsGenerating(true)
    try {
      const response = await fetch(`${API_URL}/properties/${propertyId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSelectedProperty(data.property)
        
        // Generate content
        const contentResult = await generateContent(data.property)
        setContent(contentResult.content)

        // Generate schedule
        const scheduleResult = await generateSchedule(data.property, contentResult.content)
        setSchedule({
          ...scheduleResult.schedule,
          id: scheduleResult.scheduleId
        })

        setCurrentPage('content')
        setActiveTab('portal')
      }
    } catch (err) {
      setError('Error al cargar la propiedad')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteProperty = async (propertyId, e) => {
    e?.stopPropagation()
    if (confirm('¿Eliminar esta propiedad?')) {
      try {
        await fetch(`${API_URL}/properties/${propertyId}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        })
        await loadProperties()
        if (selectedProperty?.id === propertyId) {
          setSelectedProperty(null)
          setCurrentPage('properties')
        }
      } catch (err) {
        setError('Error al eliminar')
      }
    }
  }

  const handlePublish = async (postIndex) => {
    if (!schedule) return
    
    // Get the first image URL from the property
    // For testing, use a sample image URL if local image doesn't work
    let imageUrl = selectedProperty?.images?.[0]?.url || property?.images?.[0]?.url
    
    // If it's a local localhost URL, use a sample public image for testing
    if (imageUrl && imageUrl.includes('localhost')) {
      imageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'
    }
    
    // Fallback to a sample image if no image available
    if (!imageUrl) {
      imageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'
    }
    
    try {
      const response = await fetch(`${API_URL}/schedule/${schedule.id}/publish/${postIndex}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageUrl })
      })
      if (response.ok) {
        const result = await response.json()
        const updatedPosts = [...schedule.posts]
        updatedPosts[postIndex] = result.post
        setSchedule({ ...schedule, posts: updatedPosts })
      }
    } catch (err) {
      console.error('Error publishing:', err)
    }
  }
  
  // Simulated publish for demo (shows popup animation)
  // Can receive: (platform, updatedPost) or just platform
  const handleSimulatedPublish = (platformOrIndex, updatedPost) => {
    console.log('🎯 handleSimulatedPublish called with:', platformOrIndex, updatedPost)
    
    // Determine platform
    let platform = 'Instagram'
    let postIndex = null
    
    if (typeof platformOrIndex === 'string') {
      // Called from PostDetailModal or ScheduleTimeline (platform name)
      platform = platformOrIndex
    } else if (typeof platformOrIndex === 'number') {
      // Called from PublicationPanel (post index)
      postIndex = platformOrIndex
      if (schedule?.posts?.[postIndex]) {
        const post = schedule.posts[postIndex]
        const enabledPlatform = post.platforms?.find(p => p.enabled)
        platform = enabledPlatform?.platform || 'Instagram'
        platform = platform.charAt(0).toUpperCase() + platform.slice(1)
      }
    }
    
    // If we have an updated post from PostDetailModal, we could save it here
    if (updatedPost) {
      console.log('📝 Updated post with images:', updatedPost.content?.images)
    }
    
    setResultPlatform(platform)
    
    // Show loading
    setResultStatus('loading')
    setShowResult(true)
    
    // Simulate API call (2 seconds)
    setTimeout(() => {
      // 90% success rate for demo
      const isSuccess = Math.random() < 0.9
      console.log('📊 Simulated publish result:', isSuccess ? 'SUCCESS' : 'ERROR')
      
      if (isSuccess) {
        setResultStatus('success')
        // Add notification for successful publication
        addNotification(NOTIFICATION_TYPES.POST_PUBLISHED, {
          platform: platform
        })
      } else {
        setResultStatus('error')
        // Add notification for publication error
        addNotification(NOTIFICATION_TYPES.POST_ERROR, {
          platform: platform
        })
      }
    }, 2000)
  }

  const regenerateCopies = async (platform) => {
    if (!selectedProperty) return
    setIsGenerating(true)
    try {
      const response = await fetch(`${API_URL}/content/generate/platform/${platform}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ property: selectedProperty })
      })
      if (response.ok) {
        const result = await response.json()
        setContent(prev => {
          const otherCopies = prev.socialCopies.filter(c => c.platform !== platform)
          return { ...prev, socialCopies: [...otherCopies, ...result.copies] }
        })
      }
    } catch (err) {
      setError('Error al regenerar copies')
    } finally {
      setIsGenerating(false)
    }
  }

  const regenerateAllCopies = async () => {
    if (!selectedProperty) return
    setIsGenerating(true)
    try {
      const response = await fetch(`${API_URL}/content/generate/social`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ property: selectedProperty })
      })
      if (response.ok) {
        const result = await response.json()
        setContent(prev => ({ ...prev, socialCopies: result.copies }))
      }
    } catch (err) {
      setError('Error al regenerar copies')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg z-50'
    notification.textContent = '¡Copiado!'
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 2000)
  }

  const goBack = () => {
    setSelectedProperty(null)
    setContent(null)
    setSchedule(null)
    setCurrentPage('properties')
  }

  // Tabs for content page (unified publication view)
  const tabs = [
    { id: 'portal', label: 'Portal', icon: FileText },
    { id: 'redes', label: 'Redes', icon: Sparkles },
    { id: 'instagram', label: 'Instagram', icon: Eye },
    { id: 'facebook', label: 'Facebook', icon: Eye },
    { id: 'email', label: 'Email', icon: FileText },
    { id: 'publicaciones', label: '📅 Publicaciones', icon: Calendar },
    { id: 'preview', label: 'Preview', icon: Eye }
  ]

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />
      
      case 'properties':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Propiedades</h1>
                <p className="text-slate-400 mt-1">{properties.length} propiedades</p>
              </div>
              <button 
                onClick={() => setCurrentPage('new-property')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nueva Propiedad
              </button>
            </div>

            {properties.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-xl font-semibold text-white mb-2">No hay propiedades</h3>
                <p className="text-slate-400 mb-6">Agrega tu primera propiedad para comenzar</p>
                <button 
                  onClick={() => setCurrentPage('new-property')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors"
                >
                  Crear Propiedad
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(property => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onClick={() => handleSelectProperty(property.id)}
                    onDelete={(e) => handleDeleteProperty(property.id, e)}
                  />
                ))}
              </div>
            )}
          </div>
        )

      case 'new-property':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => setCurrentPage('properties')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
              <h1 className="text-3xl font-bold text-white">Nueva Propiedad</h1>
            </div>
            <PropertyForm 
              onSubmit={handlePropertySubmit} 
              isLoading={isGenerating}
            />
          </div>
        )

      case 'content':
        if (!selectedProperty) {
          return (
            <div className="text-center py-12">
              <p className="text-slate-400">Selecciona una propiedad para ver su contenido</p>
              <button 
                onClick={() => setCurrentPage('properties')}
                className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium"
              >
                Ver Propiedades
              </button>
            </div>
          )
        }

        return (
          <div className="space-y-6">
            {/* Property Header */}
            <div className="glass-card p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden">
                    <img 
                      src={selectedProperty.images?.[0]?.url 
                        ? selectedProperty.images[0].url.startsWith('http') 
                          ? selectedProperty.images[0].url 
                          : `${API_URL.replace('/api', '')}${selectedProperty.images[0].url}`
                        : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200'}
                      alt={selectedProperty.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedProperty.title}</h2>
                    <p className="text-slate-300">
                      ${selectedProperty.price?.toLocaleString()} USD | {selectedProperty.area}m² | {selectedProperty.bedrooms} Habs/{selectedProperty.bathrooms} Baños
                    </p>
                    {selectedProperty.features?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedProperty.features.slice(0, 4).map((f, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={goBack}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                  >
                    Volver a Propiedades
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="glass-card p-2">
              <div className="flex flex-wrap gap-1">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="glass-card p-6">
              {/* Portal */}
              {activeTab === 'portal' && content && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      Descripción para Portal
                    </h3>
                    <button onClick={() => copyToClipboard(content.portalDescription)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm flex items-center gap-2">
                      <Copy className="w-4 h-4" />
                      Copiar
                    </button>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-xl min-h-32">
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{content.portalDescription}</p>
                  </div>
                </div>
              )}

              {/* Redes */}
              {activeTab === 'redes' && content && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-pink-400" />
                      Copias para Redes
                    </h3>
                    <button onClick={regenerateAllCopies} disabled={isGenerating} className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2">
                      {isGenerating ? 'Generando...' : 'Generar 3 Nuevas'}
                    </button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {content.socialCopies?.slice(0, 3).map(copy => (
                      <ContentCard key={copy.id} copy={copy} onCopy={() => copyToClipboard(copy.content.caption || copy.content.message)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Instagram */}
              {activeTab === 'instagram' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">📸 Instagram</h3>
                  </div>
                  
                  {/* AI Copywriting Section */}
                  <CopywritingContent property={selectedProperty} platform="instagram" />
                </div>
              )}

              {/* Facebook */}
              {activeTab === 'facebook' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">📘 Facebook</h3>
                  </div>
                  
                  {/* AI Copywriting Section */}
                  <CopywritingContent property={selectedProperty} platform="facebook" />
                </div>
              )}

              {/* Email */}
              {activeTab === 'email' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">📧 Email Marketing</h3>
                  </div>
                  
                  {/* AI Copywriting Section */}
                  <CopywritingContent property={selectedProperty} platform="email" />
                </div>
              )}

              {/* Publicaciones */}
              {activeTab === 'publicaciones' && (
                <ScheduleTimeline 
                  schedule={schedule || { posts: [] }} 
                  property={selectedProperty}
                  onPublish={handleSimulatedPublish}
                  onNewSchedule={() => setShowScheduleModal(true)}
                />
              )}

              {/* Preview */}
              {activeTab === 'preview' && (
                <SocialPreview property={selectedProperty} content={content} schedule={schedule} />
              )}
            </div>
          </div>
        )

      case 'leads':
        return <LeadsPage onUpdateStats={loadLeadsStats} properties={properties} />

      case 'automation':
        return <AutomationPage />

      case 'history':
        return <HistoryPage />

      default:
        return <Dashboard onNavigate={handleNavigate} />
    }
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Sidebar */}
        <Sidebar 
          currentPage={currentPage} 
          onNavigate={handleNavigate}
          stats={{ leads: leadsStats, properties: properties.length }}
          user={user}
          onLogout={logout}
        />

        {/* Main Content */}
        <main className="ml-64 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 flex items-center justify-between">
              <span><strong>Error:</strong> {error}</span>
              <button onClick={() => setError(null)} className="hover:text-red-100">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {renderPage()}
        </main>
        
        {/* Publication Result Popup (Global) */}
        <PublicationResult
          isOpen={showResult}
          status={resultStatus}
          platform={resultPlatform}
          onClose={() => setShowResult(false)}
        />
        
        {/* Schedule Modal for Manual Posts */}
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          property={selectedProperty}
          onScheduled={(newPost, dateInfo) => {
            // Refresh schedule data
            setSchedule(prev => prev ? {
              ...prev,
              posts: [...(prev.posts || []), newPost]
            } : { posts: [newPost] })
            setShowScheduleModal(false)
            
            // Get platform and date info
            const platforms = newPost.platforms?.map(p => p.platform) || ['Instagram']
            const platform = platforms[0] || 'Instagram'
            const formattedDate = dateInfo?.date || new Date(newPost.scheduledDate).toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })
            
            // Add notification for scheduled post
            addNotification(NOTIFICATION_TYPES.POST_SCHEDULED, {
              platform: platform.charAt(0).toUpperCase() + platform.slice(1),
              date: formattedDate
            })
            
            // Show success popup
            setScheduleSuccessData({
              date: formattedDate,
              time: dateInfo?.time || new Date(newPost.scheduledDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              platforms: platforms
            })
            setShowScheduleSuccess(true)
          }}
        />
        
        {/* Schedule Success Popup */}
        <ScheduleSuccessPopup
          isOpen={showScheduleSuccess}
          onClose={() => setShowScheduleSuccess(false)}
          data={scheduleSuccessData}
        />
      </div>
    </NotificationsProvider>
  )
}

export default App
