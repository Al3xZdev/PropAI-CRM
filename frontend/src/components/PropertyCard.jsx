import { useState, useRef, useEffect } from 'react'
import { MapPin, DollarSign, Maximize2, Bed, Bath, MoreVertical, Trash2, Edit2, Eye } from 'lucide-react'

export default function PropertyCard({ property, onClick, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const API_URL = import.meta.env.VITE_API_URL || '/api';
  
  const getImageUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800';
    if (url.startsWith('http')) return url;
    return `${API_URL.replace('/api', '')}${url}`;
  };
  
  const firstImage = getImageUrl(property.images?.[0]?.url);

  return (
    <div 
      onClick={onClick}
      className="glass-card overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary-500/50 transition-all"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={firstImage}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Menu Button */}
        <div ref={menuRef} className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className="w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>
          
          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-10 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-10 min-w-[140px]">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClick()
                }}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
              >
                <Eye className="w-4 h-4 text-primary-400" />
                Gestionar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(e)
                }}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          )}
        </div>

        {/* Property Type Badge */}
        <div className="absolute bottom-3 left-3">
          <span className="px-3 py-1 bg-primary-600/90 backdrop-blur-sm rounded-full text-white text-xs font-medium">
            {property.propertyType?.charAt(0).toUpperCase() + property.propertyType?.slice(1)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-lg mb-2 line-clamp-1">
          {property.title}
        </h3>
        
        <p className="text-slate-400 text-sm flex items-center gap-1 mb-3">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">{property.address}</span>
        </p>

        <div className="flex items-center justify-between mb-3">
          <p className="text-2xl font-bold text-emerald-400">
            ${property.price?.toLocaleString()}
          </p>
          <span className="text-slate-500 text-sm">USD</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400 text-sm">
          <span className="flex items-center gap-1">
            <Maximize2 className="w-4 h-4" />
            {property.area}m²
          </span>
          <span className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            {property.bedrooms}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            {property.bathrooms}
          </span>
        </div>

        {/* Features Preview */}
        {property.features?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex flex-wrap gap-1">
              {property.features.slice(0, 3).map((feature, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs"
                >
                  {feature}
                </span>
              ))}
              {property.features.length > 3 && (
                <span className="px-2 py-0.5 text-slate-500 text-xs">
                  +{property.features.length - 3} más
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
