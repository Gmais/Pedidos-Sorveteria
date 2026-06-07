import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CountingPage } from './pages/CountingPage';
import { OrderPage } from './pages/OrderPage';
import { CriticalProductsPage } from './pages/CriticalProductsPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/produtos" element={<ProductsPage />} />
        <Route path="/contagem" element={<CountingPage />} />
        <Route path="/pedido" element={<OrderPage />} />
        <Route path="/criticos" element={<CriticalProductsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
