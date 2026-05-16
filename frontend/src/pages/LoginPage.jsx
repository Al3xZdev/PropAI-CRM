import { useState, useCallback, memo } from 'react';
import { Building2, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Memoized Input Component
const Input = memo(({ type, name, value, onChange, onFocus, placeholder, autoComplete, icon: Icon, showPasswordToggle, showPassword, onTogglePassword }) => (
  <div className="relative">
    {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />}
    <input
      type={showPasswordToggle ? (showPassword ? 'text' : 'password') : type}
      name={name}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      autoComplete={autoComplete}
      className={`w-full h-11 ${Icon ? 'pl-12' : 'pl-4'} pr-${showPasswordToggle ? '12' : '4'} bg-slate-800/60 border border-slate-600/60 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
      placeholder={placeholder}
      required
    />
    {showPasswordToggle && (
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    )}
  </div>
));

export default function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const clearError = useCallback(() => setError(''), []);
  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Importante: enviar y recibir cookies
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Ya NO guardamos tokens en localStorage (están en cookies httpOnly)
      // Solo guardamos datos del usuario para la UI
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tenant', JSON.stringify(data.user.tenant));

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-slate-950">
        {/* Gradient orbs con animación suave */}
        <div 
          className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px]"
          style={{ animation: 'float 8s ease-in-out infinite' }}
        />
        <div 
          className="absolute bottom-[15%] right-[15%] w-[350px] h-[350px] bg-violet-600/15 rounded-full blur-[100px]"
          style={{ animation: 'float 10s ease-in-out infinite reverse' }}
        />
        <div 
          className="absolute top-[40%] left-[60%] w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[120px]"
          style={{ animation: 'float 12s ease-in-out infinite' }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* CSS Keyframes animation */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(30px, -30px) scale(1.05); }
            50% { transform: translate(-20px, 20px) scale(0.95); }
            75% { transform: translate(-30px, -20px) scale(1.02); }
          }
        `}</style>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Card con efecto glass */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-8 sm:p-10 backdrop-blur-xl">
          {/* Gradient overlay effect */}
          <div 
            aria-hidden="true" 
            className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 -z-10"
          />
          
          {/* Header con badge */}
          <div className="mb-8 space-y-2 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-400">
              Ingresar
            </div>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              Accede a tu workspace
            </h1>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={clearError}
                autoComplete="email"
                placeholder="tu@email.com"
                icon={Mail}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">Contraseña</label>
              <Input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={clearError}
                autoComplete="current-password"
                placeholder="••••••••"
                icon={Lock}
                showPasswordToggle={true}
                showPassword={showPassword}
                onTogglePassword={togglePassword}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  id="remember-me"
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800/60 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span>Recordarme</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-blue-600 px-6 py-3 text-white font-semibold shadow-[0_20px_60px_-30px_rgba(37,99,235,0.5)] transition-all duration-300 hover:scale-[1.02] hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Info para clientes */}
          <p className="mt-6 text-center text-xs text-slate-500">
            ¿No tenés usuario? Contactá a tu administrador para que te cree uno.
          </p>
        </div>

        {/* Logo y Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl mb-4 mx-auto">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 PropAI. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}