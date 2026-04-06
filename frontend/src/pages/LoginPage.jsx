import { useState, useCallback, memo, useEffect } from 'react';
import { Building2, Mail, Lock, User, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Memoized Input Component to prevent unnecessary re-renders
const Input = memo(({ type, name, value, onChange, onFocus, placeholder, autoComplete, icon: Icon, showPasswordToggle, onTogglePassword, error }) => (
  <div className="relative">
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />}
    <input
      type={showPasswordToggle ? (error ? 'text' : type) : type}
      name={name}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      autoComplete={autoComplete}
      className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-${showPasswordToggle ? '12' : '4'} py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
      placeholder={placeholder}
      required
    />
    {showPasswordToggle && (
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
      >
        {error ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    )}
  </div>
));

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const refresh = urlParams.get('refresh');
    const userStr = urlParams.get('user');
    const errorParam = urlParams.get('error');

    if (errorParam) {
      setError('Error en la autenticación con Google. Intentá de nuevo.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (token && refresh && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        onLogin(user);
      } catch (e) {
        setError('Error al procesar la autenticación con Google.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [onLogin]);

  const handleGoogleLogin = () => {
    setLoadingGoogle(true);
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const clearError = useCallback(() => setError(''), []);
  const clearSuccess = useCallback(() => setSuccess(''), []);
  
  const togglePassword = useCallback(() => setShowPassword(prev => !prev), []);

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password, name: formData.name })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar usuario');
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar solicitud');
      }

      setSuccess(data.message);
      
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setMode('reset');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al restablecer contraseña');
      }

      setSuccess('¡Contraseña actualizada! Ahora puedes iniciar sesión.');
      setMode('login');
      setFormData({ ...formData, password: '' });
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <Input
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={clearError}
                autoComplete="current-password"
                placeholder="••••••••"
                icon={Lock}
                showPasswordToggle={true}
                error={showPassword}
                onTogglePassword={togglePassword}
              />
            </div>

            <button
              type="submit"
              disabled={loading || loadingGoogle}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-600"></div>
              <span className="text-slate-500 text-sm">o</span>
              <div className="flex-1 h-px bg-slate-600"></div>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || loadingGoogle}
              className="w-full py-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loadingGoogle ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {loadingGoogle ? 'Redirigiendo a Google...' : 'Continuar con Google'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => switchMode('forgot')} className="text-blue-400 hover:text-blue-300">
                ¿Olvidaste tu contraseña?
              </button>
              <button type="button" onClick={() => switchMode('register')} className="text-blue-400 hover:text-blue-300">
                Crear cuenta
              </button>
            </div>
          </form>
        );

      case 'register':
        return (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onFocus={clearError}
                autoComplete="name"
                placeholder="Tu nombre"
                icon={User}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <Input
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={clearError}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                icon={Lock}
                showPasswordToggle={true}
                error={showPassword}
                onTogglePassword={togglePassword}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirmar Contraseña</label>
              <Input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onFocus={clearError}
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
                icon={Lock}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>

            <button type="button" onClick={() => switchMode('login')} className="w-full text-center text-blue-400 hover:text-blue-300 text-sm">
              Ya tengo cuenta
            </button>
          </form>
        );

      case 'forgot':
        return (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-slate-400 text-sm mb-4">
              Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <Input
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Enlace'}
            </button>

            <button type="button" onClick={() => switchMode('login')} className="w-full flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </button>
          </form>
        );

      case 'reset':
        return (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-slate-400 text-sm mb-4">
              Ingresá tu nueva contraseña.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nueva Contraseña</label>
              <Input
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                onFocus={() => setError('')}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                icon={Lock}
                showPasswordToggle={true}
                error={showPassword}
                onTogglePassword={togglePassword}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
            </button>

            <button type="button" onClick={() => switchMode('login')} className="w-full flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Iniciar Sesión';
      case 'register': return 'Crear Cuenta';
      case 'forgot': return 'Recuperar Contraseña';
      case 'reset': return 'Nueva Contraseña';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RealEstate AI</h1>
          <p className="text-slate-400 mt-1">CRM + Marketing Automation</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            {getTitle()}
          </h2>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm flex items-start gap-2 whitespace-pre-line">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {success}
            </div>
          )}

          {/* Form */}
          {renderForm()}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © 2024 RealEstate AI. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
