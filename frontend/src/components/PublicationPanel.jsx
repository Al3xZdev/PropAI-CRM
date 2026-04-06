import { useState } from 'react'
import { 
  Send, Upload, Calendar, Instagram, Facebook, Music, Globe, 
  Twitter, CheckCircle2, Clock, AlertCircle, Loader2, Image, Video,
  ChevronDown, ChevronUp, Zap, Play
} from 'lucide-react'

const PublicationPanel = ({ schedule, property, onPublish }) => {
  const [publishing, setPublishing] = useState(false)
  const [expandedPost, setExpandedPost] = useState(null)
  const [postPlatforms, setPostPlatforms] = useState({})
  const [publishedPosts, setPublishedPosts] = useState([])
  const [publishingPostId, setPublishingPostId] = useState(null)

  if (!schedule || !property) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-500" />
        <p className="text-slate-400">No hay publicaciones programadas</p>
      </div>
    )
  }

  // Initialize platforms for each post (all enabled by default)
  useState(() => {
    const initialPlatforms = {}
    schedule.posts?.forEach(post => {
      initialPlatforms[post.id] = post.platforms
        .filter(p => p.enabled)
        .map(p => p.platform)
    })
    setPostPlatforms(initialPlatforms)
  })

  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: <Instagram className="w-5 h-5" />,
      facebook: <Facebook className="w-5 h-5" />,
      tiktok: <Music className="w-5 h-5" />,
      twitter: <Twitter className="w-5 h-5" />,
      portal: <Globe className="w-5 h-5" />
    }
    return icons[platform] || <Globe className="w-5 h-5" />
  }

  const getPlatformColor = (platform) => {
    const colors = {
      instagram: 'bg-pink-500/10 text-pink-500 border-pink-500/30 hover:bg-pink-500/20',
      facebook: 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20',
      tiktok: 'bg-black/10 text-black border-black/30 hover:bg-black/20',
      twitter: 'bg-sky-500/10 text-sky-500 border-sky-500/30 hover:bg-sky-500/20',
      portal: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
    }
    return colors[platform] || 'bg-slate-500/10 text-slate-500 border-slate-500/30'
  }

  const getPlatformLabel = (platform) => {
    const labels = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      tiktok: 'TikTok',
      twitter: 'X / Twitter',
      portal: 'Portal'
    }
    return labels[platform] || platform
  }

  const getContentIcon = (type) => {
    const icons = {
      just_listed: <Image className="w-5 h-5" />,
      video_reel: <Video className="w-5 h-5" />,
      open_house: <Calendar className="w-5 h-5" />,
      price_update: <Upload className="w-5 h-5" />
    }
    return icons[type] || <Image className="w-5 h-5" />
  }

  const getTypeLabel = (type) => {
    const labels = {
      just_listed: 'Fotos + Just Listed',
      video_reel: 'Video / Reel',
      open_house: 'Open House',
      price_update: 'Actualización de Precio'
    }
    return labels[type] || type
  }

  const getTypeColor = (type) => {
    const colors = {
      just_listed: 'from-blue-500 to-cyan-500',
      video_reel: 'from-pink-500 to-rose-500',
      open_house: 'from-amber-500 to-orange-500',
      price_update: 'from-emerald-500 to-green-500'
    }
    return colors[type] || 'from-slate-500 to-slate-600'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Toggle platform selection for a post
  const togglePlatform = (postId, platform) => {
    setPostPlatforms(prev => {
      const current = prev[postId] || []
      if (current.includes(platform)) {
        return { ...prev, [postId]: current.filter(p => p !== platform) }
      } else {
        return { ...prev, [postId]: [...current, platform] }
      }
    })
  }

  // Publish a single post to selected platforms
  const handlePublishPost = async (postIndex) => {
    if (onPublish) {
      setPublishingPostId(schedule.posts[postIndex].id)
      await onPublish(postIndex)
      setPublishingPostId(null)
      setPublishedPosts(prev => [...prev, schedule.posts[postIndex].id])
    }
  }

  // Publish all posts to selected platforms
  const handlePublishAll = async () => {
    setPublishing(true)
    
    for (let i = 0; i < schedule.posts.length; i++) {
      const post = schedule.posts[i]
      if (post.status !== 'published' && !publishedPosts.includes(post.id)) {
        setPublishingPostId(post.id)
        if (onPublish) {
          await onPublish(i)
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
        setPublishedPosts(prev => [...prev, post.id])
      }
    }
    
    setPublishing(false)
    setPublishingPostId(null)
  }

  // Count enabled platforms for a post
  const getEnabledPlatformsCount = (postId) => {
    return postPlatforms[postId]?.length || 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
          <Send className="w-7 h-7 text-primary-400" />
          Publicar en Plataformas
        </h2>
        <p className="text-slate-400 mt-2">
          Selecciona las redes donde quieres publicar y haz clic en publicar
        </p>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {schedule.posts?.map((post, idx) => {
          const isPublished = post.status === 'published' || publishedPosts.includes(post.id)
          const isExpanded = expandedPost === post.id
          const enabledPlatforms = postPlatforms[post.id] || post.platforms.filter(p => p.enabled).map(p => p.platform)
          
          return (
            <div 
              key={post.id}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all ${
                isPublished ? 'ring-2 ring-emerald-500 ring-opacity-50' : ''
              }`}
            >
              {/* Post Header - Always Visible */}
              <div 
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedPost(isExpanded ? null : post.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getTypeColor(post.type)} flex items-center justify-center text-white shadow-md`}>
                    {getContentIcon(post.type)}
                  </div>

                  {/* Content Info */}
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-lg">{post.title}</h4>
                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(post.scheduledDate)} • <span className="font-medium bg-slate-100 px-2 py-0.5 rounded">Día {post.day}</span>
                    </p>
                  </div>

                  {/* Status & Expand */}
                  <div className="flex items-center gap-3">
                    {isPublished ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-5 h-5" />
                       Publicado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-5 h-5" />
                        Programado
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Platform Pills - Quick View */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {post.platforms.filter(p => p.enabled).map(platform => (
                    <span 
                      key={platform.id}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
                        enabledPlatforms.includes(platform.platform)
                          ? getPlatformColor(platform.platform)
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {getPlatformIcon(platform.platform)}
                      {getPlatformLabel(platform.platform)}
                      {enabledPlatforms.includes(platform.platform) && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Expanded Content - Platform Selection */}
              {isExpanded && !isPublished && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="pt-4">
                    <h5 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Selecciona las plataformas:
                    </h5>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {post.platforms.filter(p => p.enabled).map(platform => {
                        const isEnabled = enabledPlatforms.includes(platform.platform)
                        return (
                          <button
                            key={platform.id}
                            onClick={() => togglePlatform(post.id, platform.platform)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              isEnabled 
                                ? getPlatformColor(platform.platform)
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              isEnabled ? 'bg-white/20' : 'bg-slate-200'
                            }`}>
                              {getPlatformIcon(platform.platform)}
                            </div>
                            <span className="font-medium text-sm">
                              {getPlatformLabel(platform.platform)}
                            </span>
                            {isEnabled && (
                              <CheckCircle2 className="w-5 h-5 absolute -top-1 -right-1 text-emerald-500" />
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Publish Button for this Post */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handlePublishPost(idx)}
                        disabled={publishingPostId || enabledPlatforms.length === 0}
                        className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                          publishingPostId || enabledPlatforms.length === 0
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105'
                        }`}
                      >
                        {publishingPostId === post.id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Publicando...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5" />
                            Publicar ({enabledPlatforms.length})
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Already Published Message */}
              {isPublished && isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="pt-4">
                    <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <div>
                        <p className="font-semibold text-emerald-800">¡Publicado exitosamente!</p>
                        <p className="text-sm text-emerald-600">Tu contenido ya está activo en las plataformas seleccionadas</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Publish All Button */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Publicar Todo Ahora
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Publica todas las publicaciones en sus plataformas seleccionadas
            </p>
          </div>
          
          <button
            onClick={handlePublishAll}
            disabled={publishing}
            className={`px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all shadow-lg ${
              publishing
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 hover:from-yellow-300 hover:to-orange-400 hover:scale-105'
            }`}
          >
            {publishing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Zap className="w-6 h-6" />
                Publicar Todo
              </>
            )}
          </button>
        </div>

        {publishedPosts.length > 0 && (
          <div className="mt-4 p-3 bg-emerald-500/20 rounded-xl">
            <p className="text-emerald-400 text-sm font-medium text-center">
              ✓ {publishedPosts.length} publicaciones completadas exitosamente
            </p>
          </div>
        )}
      </div>

      {/* Platform Status Legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['instagram', 'facebook', 'tiktok', 'twitter', 'portal'].map(platform => (
          <div key={platform} className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
              platform === 'instagram' ? 'bg-pink-500/20' :
              platform === 'facebook' ? 'bg-blue-500/20' :
              platform === 'tiktok' ? 'bg-black/20' :
              platform === 'twitter' ? 'bg-sky-500/20' :
              'bg-emerald-500/20'
            }`}>
              {getPlatformIcon(platform)}
            </div>
            <p className="text-sm text-slate-300 font-medium">{getPlatformLabel(platform)}</p>
            <p className="text-xs text-emerald-400 mt-1">Conectado</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PublicationPanel