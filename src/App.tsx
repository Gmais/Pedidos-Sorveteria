import { Navigate, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CountingPage } from './pages/CountingPage';
import { OrderPage } from './pages/OrderPage';
import { CriticalProductsPage } from './pages/CriticalProductsPage';
import { LoginPage } from './pages/LoginPage';
import { StoreProvider } from './contexts/StoreContext';

function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/contagem" element={<CountingPage />} />
            <Route path="/pedido" element={<OrderPage />} />
            <Route path="/criticos" element={<CriticalProductsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StoreProvider>
  );
}

export default App;
