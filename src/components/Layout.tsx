import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useTheme } from '../contexts/ThemeContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';
import type { StoreId } from '../db/types';

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/produtos', label: 'Produtos', icon: '📦' },
  { to: '/contagem', label: 'Contagem', icon: '🔢' },
  { to: '/pedido', label: 'Pedido', icon: '📋' },
  { to: '/criticos', label: 'Críticos', icon: '⚠️' },
];

const STORE_OPTIONS: { id: StoreId; label: string }[] = [
  { id: 'sorvetes', label: 'Sorvetes' },
  { id: 'distribuidora', label: 'Distribuidora' },
  { id: 'mercado', label: 'Mercado' }
];

export function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { activeStore, setActiveStore } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStoreSwitch = (id: StoreId) => {
    setActiveStore(id);
    navigate('/');
  };

  async function handleLogout() {
    await signOut(auth);
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <header className="sticky top-0 z-20 bg-guri-blue text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <img src="/logo.png" alt="Logo Sorvetes Guri" className="w-8 h-8 rounded-full object-cover bg-white p-0.5" />
            Controle de estoque
          </h1>
          
          <div className="flex bg-black/20 p-1 rounded-lg backdrop-blur-sm">
            {STORE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleStoreSwitch(option.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeStore === option.id
                    ? 'bg-white text-guri-blue shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-black/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Alternar modo claro/escuro"
              className="hidden sm:flex rounded-full w-9 h-9 items-center justify-center text-lg bg-black/20 hover:bg-black/30 transition-colors backdrop-blur-sm"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user && (
              <button
                onClick={handleLogout}
                title={`Sair (${user.email})`}
                className="flex items-center gap-1.5 rounded-lg bg-black/20 hover:bg-red-600/80 transition-colors px-3 py-1.5 text-sm font-medium backdrop-blur-sm"
              >
                <span className="hidden sm:inline truncate max-w-[120px] text-blue-100">{user.email}</span>
                <span>🚪</span>
              </button>
            )}
          </div>
        </div>
        <nav className="border-t border-blue-600/30 sm:border-t-0 bg-black/10 sm:bg-transparent">
          <div className="max-w-5xl mx-auto grid grid-cols-5 sm:flex sm:justify-center sm:gap-2 sm:py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:px-4 sm:py-2 sm:rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'text-guri-yellow bg-black/20 sm:bg-white/10'
                      : 'text-blue-100 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <span className="text-xl sm:text-base">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 sm:py-6">
        <Outlet />
      </main>

    </div>
  );
}
