import { Copy, Instagram, Facebook, Music } from 'lucide-react'

const ContentCard = ({ copy, onCopy, platformColor = 'from-purple-500 to-pink-500' }) => {
  const getPlatformIcon = () => {
    switch (copy.platform) {
      case 'instagram':
        return <Instagram className="w-4 h-4" />
      case 'facebook':
        return <Facebook className="w-4 h-4" />
      case 'tiktok':
        return <Music className="w-4 h-4" />
      default:
        return null
    }
  }

  const getPlatformLabel = () => {
    switch (copy.platform) {
      case 'instagram':
        return 'Instagram'
      case 'facebook':
        return 'Facebook'
      case 'tiktok':
        return 'TikTok'
      default:
        return copy.platform
    }
  }

  const getContent = () => {
    if (copy.content.caption) return copy.content.caption
    if (copy.content.message) return copy.content.message
    if (copy.content.script) return copy.content.script
    return ''
  }

  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden hover:bg-slate-800/70 transition-colors">
      {/* Header */}
      <div className={`p-3 bg-gradient-to-r ${platformColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            {getPlatformIcon()}
            <span className="font-medium text-sm">{getPlatformLabel()}</span>
          </div>
          <span className="px-2 py-0.5 bg-white/20 rounded text-xs text-white">
            Opción {copy.variation || 1}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-8 mb-4">
          {getContent()}
        </p>

        {/* Hashtags */}
        {copy.content.hashtags && copy.content.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {copy.content.hashtags.slice(0, 5).map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-primary-500/20 text-primary-300 rounded text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Copy Button */}
        <button
          onClick={onCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copiar
        </button>
      </div>
    </div>
  )
}

export default ContentCard
