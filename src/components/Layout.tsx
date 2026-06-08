import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/produtos', label: 'Produtos', icon: '📦' },
  { to: '/contagem', label: 'Contagem', icon: '🔢' },
  { to: '/pedido', label: 'Pedido', icon: '📋' },
  { to: '/criticos', label: 'Críticos', icon: '⚠️' },
];

export function Layout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            🍦 Estoque Sorveteria
          </h1>
          <button
            onClick={toggleTheme}
            aria-label="Alternar modo claro/escuro"
            className="rounded-full w-11 h-11 flex items-center justify-center text-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
        <nav className="border-t border-slate-200 dark:border-slate-700 sm:border-t-0">
          <div className="max-w-5xl mx-auto grid grid-cols-5 sm:flex sm:justify-center sm:gap-2 sm:py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:px-4 sm:py-2 sm:rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 sm:bg-blue-50 sm:dark:bg-blue-900/30'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
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
