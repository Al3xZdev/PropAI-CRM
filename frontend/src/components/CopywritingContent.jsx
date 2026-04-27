import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Copy, CheckCheck, Image, Square, Mail } from 'lucide-react'

export default function CopywritingContent({ property, platform, content, variationIndex = 0 }) {
  const [generatedCopies, setGeneratedCopies] = useState({})
  const [copiedId, setCopiedId] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeFilter, setActiveFilter] = useState(platform === 'instagram' ? 'all' : 'post')

  // Use backend content if available, otherwise fall back to templates
  const useBackendContent = content && (
    (platform === 'instagram' && content.socialCopies?.some(c => c.platform === 'instagram')) ||
    (platform === 'facebook' && content.socialCopies?.some(c => c.platform === 'facebook')) ||
    (platform === 'email' && content.emailMarketing != null)
  )

  // Get copies from backend content (limit to 3 per platform)
  useEffect(() => {
    if (!useBackendContent) return
    
    if (platform === 'instagram') {
      const instaCopies = content.socialCopies
        ?.filter(c => c.platform === 'instagram')
        .slice(0, 3)  // Show max 3
        .map((c, idx) => ({
          id: c.id,
          text: c.content?.caption || c.content?.message || '',
          type: c.type || 'feed',
          selected: idx === 0
        })) || []
      // Separate posts and stories
      const posts = instaCopies.filter(c => c.type !== 'story')
      const stories = instaCopies.filter(c => c.type === 'story')
      setGeneratedCopies({ post: posts, story: stories })
    } else if (platform === 'facebook') {
      const fbCopies = content.socialCopies
        ?.filter(c => c.platform === 'facebook')
        .slice(0, 3)  // Show max 3
        .map((c, idx) => ({
          id: c.id,
          text: c.content?.caption || c.content?.message || '',
          selected: idx === 0
        })) || []
      setGeneratedCopies({ post: fbCopies })
    } else if (platform === 'email') {
      // Handle new single object structure: { id, content: { subject, body }, cta }
      // with fallback for old array structure
      const email = content.emailMarketing;
      if (email) {
        const emailObj = {
          id: email.id,
          subject: email.content?.subject || email.subject || '',
          body: email.content?.body || email.body || '',
          text: `${email.content?.subject || email.subject || ''}\n\n${email.content?.body || email.body || ''}`,
          selected: true
        };
        setGeneratedCopies({ email: [emailObj] });
      } else {
        setGeneratedCopies({ email: [] });
      }
    }
  }, [content, platform, useBackendContent])

  // Copy templates
  const instagramPostTemplates = [
    "¡Encontrá tu hogar perfecto! 🏠 Esta propiedad tiene todo lo que necesitás: ubicación privilegiada, espacios luminosos y el ambiente que tu familia merece. 💫\n\n📍 [Dirección]\n💰 USD [Precio]\n\n📩 Escribinos para una visita virtual!\n.\n.\n.\n#RealEstate #Propiedad #CasaNueva #SueñosCumplidos",
    "¿Buscás vivir cerca de todo? 👀 Esta propiedad es para vos!\n\n✨ Living amplio con vista al jardín\n✨ Cocina moderna completamente equipada\n✨ Dormitorio principal con vestidor\n✨ Patio con pileta para el verano\n\n📲 Contactanos AHORA y agendá tu visita!\n.\n.\n.\n#Inmobiliaria #ComprarCasa #HogarDulceHogar #MiCasaMiEstilo",
    "¡PRIMERA OPORTUNIDAD! 🌟 No te pierdas esta propiedad única\n\n📐 [Superficie] m²\n🛏️ [Habitaciones] habitaciones\n🚿 [Baños] baños\n🚗 Garage para [Autos] autos\n\n⭐ Ideal para familia - escuelas y shops a minutos\n\n💬 Escribinos por MD o llamá ahora!"
  ]

  const instagramStoryTemplates = [
    "🏠 ¡Nueva propiedad en el mercado! Swipe ➡️ para ver más 📸 #RealEstate",
    "💰 Precio especial por tiempo limitado. Consultanos HOY! 📲 #Oportunidad",
    "📍 Ubicación exclusiva a solo minutos del centro. ¡No te la pierdas! 👀"
  ]

  const facebookPostTemplates = [
    "¡Buen día! 👋 Tenemos el placer de presentarles esta propiedad espectacular que acaba de salir al mercado.\n\nCaracterísticas:\n✅ Ubicación inmejorable\n✅ Ambios ambientes\n✅ Iluminación natural\n✅ Terminaciones de primera calidad\n\n¿Les interesa? Dejen un 💬 en los comentarios o escribannos por privado. ¡Estamos para ayudarlos!\n\n#RealEstate #Propiedades #ComprarCasa",
    "¡ATENCIÓN COMPRADORES! 🚨 Esta propiedad no va a durar mucho en el mercado. Precios competitivos, financiación flexible y la mejor atención del mercado.\n\n📞 Llamanos hoy\n💬 O envíanos un mensaje privado\n🏠 Visitas disponibles desde esta semana\n\n¡No dejes pasar esta oportunidad!",
    "¿Ya conocés nuestra cartera de propiedades? 🏠✨\n\nTrabajamos día a día para encontrar la propiedad perfecta para vos y tu familia. Ya seas comprador primerizo o inversor experimentado, tenemos opciones para todos los gustos y presupuestos.\n\n📩 Escribinos y comienza tu búsqueda hoy!"
  ]

  // Email marketing templates
  const emailTemplates = [
    {
      subject: "🏠 ¡Nueva propiedad que te puede interesar!",
      body: "¡Hola [Nombre]!\n\nTenemos el agrado de presentarte esta oportunidad única que sabemos que te va a interesar.\n\n📍 [Dirección]\n💰 USD [Precio]\n📐 [Superficie] m²\n🛏️ [Habitaciones] habitaciones | 🚿 [Baños] baños\n\nEsta propiedad combina ubicación, comodidad y el mejor precio del mercado. No suele durar mucho disponible.\n\n¿Te gustaría conocerla? Podemos coordinar una visita o enviarte más fotos y videos.\n\nEstamos a tu disposición.\n\n¡Saludos!"
    },
    {
      subject: "💎 Oportunidad: Propiedad en excelente ubicación",
      body: "¡Hola [Nombre]!\n\nTe escribo porque acaba de salir al mercado una propiedad que matchea perfectamente con lo que estás buscando.\n\n✨ Living amplio con mucha luz natural\n✨ Ubicación estratégica - todo a minutos\n✨ Precio competitivo con financiación disponible\n\n📞 Podés escribirme directamente o llamarme para coordinar una visita.\n\n¡Espero tu respuesta!\n\nSaludos cordiales"
    },
    {
      subject: "📢 Primera oportunidad - No te la pierdas",
      body: "¡Hola [Nombre]!\n\nQuiero contarte sobre esta propiedad que acaba de llegar a nuestra cartera. Es una oportunidad que no se ve todos los días.\n\n🏠 Características principales:\n• [Dirección]\n• USD [Precio]\n• [Superficie] m²\n• [Habitaciones] habitaciones\n• [Baños] baños\n\nEsta zona está en constante crecimiento y los precios van en aumento. Si te interesa, no dejes pasar esta oportunidad.\n\nContactame HOY para más información.\n\n¡Abrazo!"
    }
  ]

  // Personalize template with property data
  const personalizeTemplate = (template) => {
    if (!property) return template
    return template
      .replace('[Dirección]', property.address || 'Ubicación céntrica')
      .replace('[Precio]', property.price?.toLocaleString() || 'Consultar')
      .replace('[Superficie]', property.area || '120')
      .replace('[Habitaciones]', property.bedrooms || '3')
      .replace('[Baños]', property.bathrooms || '2')
      .replace('[Autos]', '2')
  }

  // Generate copies for a platform and type
  const generateCopies = (type) => {
    setIsGenerating(true)
    
    setTimeout(() => {
      let templates = []
      let key = ''
      
      if (platform === 'instagram') {
        key = type
        templates = type === 'story' ? instagramStoryTemplates : instagramPostTemplates
      } else if (platform === 'facebook') {
        key = 'post'
        templates = facebookPostTemplates
      } else if (platform === 'email') {
        // Email has both subject and body
        const shuffled = [...emailTemplates].sort(() => Math.random() - 0.5)
        const copies = shuffled.map((template, idx) => ({
          id: `email-${Date.now()}-${idx}`,
          subject: template.subject,
          body: personalizeTemplate(template.body),
          text: `${template.subject}\n\n${personalizeTemplate(template.body)}`,
          selected: idx === 0
        }))
        setGeneratedCopies(prev => ({ ...prev, email: copies }))
        setIsGenerating(false)
        return
      }
      
      // Shuffle templates
      const shuffled = [...templates].sort(() => Math.random() - 0.5)
      
      const copies = shuffled.map((template, idx) => ({
        id: `${platform}-${key}-${Date.now()}-${idx}`,
        text: personalizeTemplate(template),
        selected: idx === 0
      }))
      
      setGeneratedCopies(prev => ({ ...prev, [key]: copies }))
      setIsGenerating(false)
    }, 500)
  }

  // Generate copies (fall back to templates if no backend content)
  useEffect(() => {
    // Don't regenerate if we have backend content
    if (useBackendContent) return
    
    if (platform === 'instagram') {
      generateCopies('post')
      generateCopies('story')
    } else if (platform === 'facebook') {
      generateCopies('post')
    } else if (platform === 'email') {
      generateCopies('email')
    }
  }, [platform, property?.id, useBackendContent])

  // Copy to clipboard
  const copyToClipboard = async (copyId, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(copyId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Select a copy
  const selectCopy = (type, copyId) => {
    setGeneratedCopies(prev => ({
      ...prev,
      [type]: (prev[type] || []).map(copy => ({
        ...copy,
        selected: copy.id === copyId
      }))
    }))
  }

  if (platform === 'instagram') {
    const postCopies = generatedCopies['post'] || []
    const storyCopies = generatedCopies['story'] || []
    const showPosts = activeFilter === 'all' || activeFilter === 'post'
    const showStories = activeFilter === 'all' || activeFilter === 'story'
    
    return (
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === 'all' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todo
          </button>
          <button
            onClick={() => setActiveFilter('post')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeFilter === 'post' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Image className="w-4 h-4" /> Post
          </button>
          <button
            onClick={() => setActiveFilter('story')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeFilter === 'story' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Square className="w-4 h-4" /> Historia
          </button>
        </div>

        {/* Post Copies */}
        {showPosts && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-blue-400" />
                <h4 className="text-white font-medium text-sm">📝 Copies para Post</h4>
                <span className="text-xs text-slate-500">({postCopies.length})</span>
              </div>
              <button
                onClick={() => generateCopies('post')}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                Generar nuevas opciones
              </button>
            </div>
            
            <div className="space-y-2">
              {postCopies.map((copy) => (
                <div
                  key={copy.id}
                  className={`bg-slate-700/50 rounded-lg p-3 border-2 transition-all cursor-pointer ${
                    copy.selected ? 'border-blue-500' : 'border-transparent hover:border-slate-600'
                  }`}
                  onClick={() => selectCopy('post', copy.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-200 text-sm whitespace-pre-wrap flex-1">{copy.text}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(copy.id, copy.text)
                      }}
                      className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                        copiedId === copy.id ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                    >
                      {copiedId === copy.id ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Story Copies */}
        {showStories && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4 text-pink-400" />
                <h4 className="text-white font-medium text-sm">📱 Copies para Historia</h4>
                <span className="text-xs text-slate-500">({storyCopies.length})</span>
              </div>
              <button
                onClick={() => generateCopies('story')}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                Generar nuevas opciones
              </button>
            </div>
            
            <div className="space-y-2">
              {storyCopies.map((copy) => (
                <div
                  key={copy.id}
                  className={`bg-slate-700/50 rounded-lg p-3 border-2 transition-all cursor-pointer ${
                    copy.selected ? 'border-pink-500' : 'border-transparent hover:border-slate-600'
                  }`}
                  onClick={() => selectCopy('story', copy.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-200 text-sm whitespace-pre-wrap flex-1">{copy.text}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(copy.id, copy.text)
                      }}
                      className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                        copiedId === copy.id ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                    >
                      {copiedId === copy.id ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (platform === 'facebook') {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-white font-medium text-sm">📝 Copies para publicación</h4>
          </div>
          <button
            onClick={() => generateCopies('post')}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
            Generar nuevas opciones
          </button>
        </div>
        
        <div className="space-y-2">
          {(generatedCopies['post'] || []).map((copy) => (
            <div
              key={copy.id}
              className={`bg-slate-700/50 rounded-lg p-3 border-2 transition-all cursor-pointer ${
                copy.selected ? 'border-blue-600' : 'border-transparent hover:border-slate-600'
              }`}
              onClick={() => selectCopy('post', copy.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-slate-200 text-sm whitespace-pre-wrap flex-1">{copy.text}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(copy.id, copy.text)
                  }}
                  className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                    copiedId === copy.id ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  {copiedId === copy.id ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (platform === 'email') {
    const emailCopies = generatedCopies['email'] || []
    
    return (
      <div className="space-y-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <h4 className="text-white font-medium text-sm">📧 Email Marketing</h4>
              <span className="text-xs text-slate-500">({emailCopies.length})</span>
            </div>
            <button
              onClick={() => generateCopies('email')}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
              Generar nuevas opciones
            </button>
          </div>
          
          <div className="space-y-3">
            {emailCopies.map((copy) => (
              <div
                key={copy.id}
                className={`bg-slate-700/50 rounded-lg p-4 border-2 transition-all cursor-pointer ${
                  copy.selected ? 'border-emerald-500' : 'border-transparent hover:border-slate-600'
                }`}
                onClick={() => selectCopy('email', copy.id)}
              >
                <div className="mb-3">
                  <p className="text-emerald-400 text-xs font-medium mb-1">Asunto:</p>
                  <p className="text-white text-sm font-medium">{copy.subject}</p>
                </div>
                <div className="border-t border-slate-600 pt-3">
                  <p className="text-emerald-400 text-xs font-medium mb-1">Contenido:</p>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{copy.body}</p>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(copy.id, copy.text)
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      copiedId === copy.id ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    {copiedId === copy.id ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedId === copy.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
