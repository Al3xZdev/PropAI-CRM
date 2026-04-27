import { FileText, Instagram, Mail, Hash, Sparkles } from 'lucide-react'

export default function GeneratedContent({ content }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-3">
        <Sparkles className="w-7 h-7 text-amber-400" />
        Contenido Generado por IA
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Portal Description */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Descripción para Portales</h3>
              <p className="text-xs text-slate-400">Para Immuebles.com, Vivanuncios, etc.</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg">
            <div className="prose prose-sm prose-invert max-w-none">
              {content.portalDescription.split('\n').map((paragraph, idx) => (
                paragraph.trim() && (
                  <p key={idx} className="text-slate-300 text-sm leading-relaxed mb-3">
                    {paragraph}
                  </p>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Short Description */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Descripción Corta</h3>
              <p className="text-xs text-slate-400">Para redes sociales</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg">
            <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans">
              {content.shortDescription}
            </pre>
          </div>
        </div>

        {/* Social Copies */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Copies para Redes</h3>
              <p className="text-xs text-slate-400">3 variaciones listas para publicar</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {content.socialCopies?.map((copy, idx) => (
              <div key={copy.id} className="bg-slate-800/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    copy.platform === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                    copy.platform === 'facebook' ? 'bg-blue-600 text-white' :
                    copy.platform === 'tiktok' ? 'bg-black text-white border border-slate-700' :
                    'bg-slate-600 text-white'
                  }`}>
                    {copy.platform.charAt(0).toUpperCase() + copy.platform.slice(1)}
                  </span>
                  <span className="text-xs text-slate-500">
                    Variación {copy.variation}
                  </span>
                </div>
                <p className="text-slate-300 text-sm line-clamp-3">
                  {copy.content.caption || copy.content.message || copy.content.script?.substring(0, 100)}
                  ...
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Email Marketing */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Email Marketing</h3>
              <p className="text-xs text-slate-400">Listo para enviar</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
            <div>
              <p className="text-xs text-slate-500">Asunto:</p>
              <p className="text-white font-medium">{content.emailMarketing?.content?.subject}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Preheader:</p>
              <p className="text-slate-300 text-sm">{content.emailMarketing?.content?.preheader}</p>
            </div>
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-1">CTA:</p>
              <span className="inline-block px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg">
                {content.emailMarketing?.cta?.text}
              </span>
            </div>
          </div>
        </div>

        {/* Hashtags */}
        <div className="glass-card p-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <Hash className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Hashtags Recomendados</h3>
              <p className="text-xs text-slate-400">Optimizados para cada plataforma</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {content.hashtags?.map((tag, idx) => (
              <span 
                key={idx}
                className="px-3 py-1 bg-slate-800 text-primary-300 rounded-full text-sm hover:bg-slate-700 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
