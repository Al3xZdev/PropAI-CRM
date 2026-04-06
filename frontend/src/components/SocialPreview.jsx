import { Heart, MessageCircle, Share2, MapPin, Send, Globe } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api';

const SocialPreview = ({ property, content, schedule }) => {
  const getImageUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600';
    if (url.startsWith('http')) return url;
    return `${API_URL.replace('/api', '')}${url}`;
  };
  
  const firstImage = getImageUrl(property?.images?.[0]?.url);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-3">
        <Globe className="w-7 h-7 text-cyan-400" />
        Preview de Publicaciones
      </h2>
      <p className="text-slate-400">
        Así se verá tu contenido en cada plataforma. Cada red social muestra una vista previa diferente.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instagram Preview */}
        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span className="text-xl">📸</span> Instagram
            </h3>
          </div>
          <div className="bg-slate-900">
            <div className="p-3 flex items-center gap-3 border-b border-slate-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <span className="font-semibold text-sm text-white">realestate_pro</span>
            </div>
            <img src={firstImage} alt="Property" className="w-full h-64 object-cover" />
            <div className="p-3 border-b border-slate-700">
              <div className="flex gap-4 mb-2">
                <Heart className="w-6 h-6 text-white" />
                <MessageCircle className="w-6 h-6 text-white" />
                <Send className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-white text-sm">142 Me gusta</p>
            </div>
            <div className="p-3">
              <p className="text-sm text-white">
                <span className="font-semibold">realestate_pro</span>{' '}
                <span className="text-slate-300">
                  ¡LISTO PARA SER TU NUEVO HOGAR! ✨ Esta belleza acaba de llegar al mercado...
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Hace 2 horas</p>
            </div>
          </div>
        </div>

        {/* Facebook Preview */}
        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <div className="p-4 bg-blue-600">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span className="text-xl">📘</span> Facebook
            </h3>
          </div>
          <div className="bg-slate-900">
            <div className="p-4 flex items-center gap-3 border-b border-slate-700">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold">RE</span>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Real Estate Pro</p>
                <p className="text-xs text-slate-500">Hace 3 horas</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-white text-sm mb-3">🏠 ¡GRAN OPORTUNIDAD INMOBILIARIA!</p>
              <img src={firstImage} alt="Property" className="w-full h-48 object-cover rounded-lg mb-3" />
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="font-semibold text-white text-sm">{property?.title}</p>
                <p className="text-emerald-400 font-bold mt-1">${property?.price?.toLocaleString()} USD</p>
                <p className="text-slate-400 text-xs mt-2">📍 {property?.address}</p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="flex justify-around py-2 border-t border-slate-700">
                <span className="text-slate-400 text-sm">👍 Me gusta</span>
                <span className="text-slate-400 text-sm">💬 Comentar</span>
                <span className="text-slate-400 text-sm">↗️ Compartir</span>
              </div>
            </div>
          </div>
        </div>

        {/* TikTok Preview */}
        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <div className="p-4 bg-black border-b border-slate-700">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span className="text-xl">🎵</span> TikTok
            </h3>
          </div>
          <div className="relative bg-black">
            <img src={firstImage} alt="Property" className="w-full h-80 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute right-4 bottom-24 flex flex-col gap-4">
              <div className="text-center"><p className="text-xl">❤️</p><p className="text-white text-xs">12.5K</p></div>
              <div className="text-center"><p className="text-xl">💬</p><p className="text-white text-xs">432</p></div>
              <div className="text-center"><p className="text-xl">↗️</p><p className="text-white text-xs">1.2K</p></div>
            </div>
            <div className="absolute bottom-4 left-4 right-12">
              <p className="text-white text-sm font-medium mb-2">@realestate_pro</p>
              <p className="text-white text-xs">POV: Encontraste la casa perfecta... 😍 #realestate #dreamhome</p>
            </div>
          </div>
        </div>

        {/* Twitter/X Preview */}
        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <div className="p-4 bg-slate-900 border-b border-slate-700">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span className="text-xl">🐦</span> Twitter / X
            </h3>
          </div>
          <div className="bg-slate-900 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700" />
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-bold text-white text-sm">Real Estate Pro</span>
                  <span className="text-slate-500 text-sm">@realestate_pro</span>
                  <span className="text-slate-500 text-sm">·</span>
                  <span className="text-slate-500 text-sm">2h</span>
                </div>
                <p className="text-white text-sm mb-3">🏠 Nueva propiedad en {property?.address}</p>
                <img src={firstImage} alt="Property" className="w-full h-40 object-cover rounded-lg mb-2" />
                <div className="bg-slate-800 p-3 rounded-lg mb-2">
                  <p className="font-semibold text-white text-sm">{property?.title}</p>
                  <p className="text-emerald-400 font-bold">${property?.price?.toLocaleString()} USD</p>
                  <p className="text-slate-400 text-xs">{property?.bedrooms} hab | {property?.bathrooms} baños | {property?.area}m²</p>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span className="text-sm">💬 45</span>
                  <span className="text-sm">↗️ 23</span>
                  <span className="text-sm">❤️ 234</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Preview */}
      <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Portal Inmobiliario
          </h3>
        </div>
        <div className="p-6">
          <div className="flex gap-6">
            <img src={firstImage} alt="Property" className="w-64 h-48 object-cover rounded-xl" />
            <div className="flex-1">
              <h4 className="font-bold text-white text-2xl mb-2">{property?.title}</h4>
              <p className="text-slate-400 flex items-center gap-1 mb-4">
                <MapPin className="w-4 h-4" />
                {property?.address}
              </p>
              <div className="flex gap-3 mb-4">
                <span className="px-4 py-2 bg-slate-700 rounded-full text-sm text-slate-300">🛏️ {property?.bedrooms} habitaciones</span>
                <span className="px-4 py-2 bg-slate-700 rounded-full text-sm text-slate-300">🚿 {property?.bathrooms} baños</span>
                <span className="px-4 py-2 bg-slate-700 rounded-full text-sm text-slate-300">📐 {property?.area} m²</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400 mb-4">${property?.price?.toLocaleString()} USD</p>
              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium">Contactar Agente</button>
                <button className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium">Agendar Visita</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SocialPreview
