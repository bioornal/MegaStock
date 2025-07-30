"use client";

import { useState, useEffect } from 'react';
import { getProducts } from '@/services/productService';
import { Package, Archive, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import LowStockModal from './LowStockModal';
import DashboardCharts from './DashboardCharts';
import MonthlySalesCard from './MonthlySalesCard';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
}

const StatCard = ({ title, value, icon, color, onClick, clickable = false }: StatCardProps) => (
  <div 
    className={`card text-white mb-3 bg-${color} shadow-sm ${
      clickable ? 'cursor-pointer card-hover' : ''
    }`}
    onClick={onClick}
    style={clickable ? { cursor: 'pointer', transition: 'transform 0.2s' } : {}}
    onMouseEnter={(e) => {
      if (clickable) {
        e.currentTarget.style.transform = 'scale(1.02)';
      }
    }}
    onMouseLeave={(e) => {
      if (clickable) {
        e.currentTarget.style.transform = 'scale(1)';
      }
    }}
  >
    <div className="card-body d-flex align-items-center">
      {icon}
      <div className='ms-3'>
        <h5 className="card-title mb-1">{value}</h5>
        <p className="card-text mb-0 small">
          {title}
          {clickable && <span className="ms-1">👆</span>}
        </p>
      </div>
    </div>
  </div>
);

const DashboardStats = () => {
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState(0);
  const [totalCapital, setTotalCapital] = useState('0.00');
  const [isLoading, setIsLoading] = useState(true);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  const fetchStats = async () => {
    try {
      const products = await getProducts();
      const total = products.reduce((sum, product) => sum + product.stock, 0);
      const lowStock = products.filter(p => p.stock <= 2).length;
      const capital = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
      
      setTotalProducts(products.length);
      setTotalStock(total);
      setLowStockProducts(lowStock);
      setTotalCapital(capital.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div className="text-center">Cargando estadísticas...</div>;
  }

  return (
    <div>
      <h4 className='mb-3 fw-bold'>Resumen General</h4>
      
      {/* Card de ventas mensuales */}
      <MonthlySalesCard />
      <StatCard 
        title="Total Productos" 
        value={totalProducts} 
        icon={<Package size={30} />} 
        color="primary" 
      />
      <StatCard 
        title="Inventario Total" 
        value={totalStock} 
        icon={<Archive size={30} />} 
        color="success" 
      />
      <StatCard 
        title="Capital en Stock" 
        value={totalCapital} 
        icon={<DollarSign size={30} />} 
        color="info" 
      />
      <StatCard 
        title="Bajo Stock (≤2)" 
        value={lowStockProducts} 
        icon={<AlertTriangle size={30} />} 
        color="warning"
        onClick={() => setShowLowStockModal(true)}
        clickable={true}
      />
      
      {/* Gráficos de análisis */}
      <DashboardCharts />
      
      {/* Modal de productos con bajo stock */}
      <LowStockModal 
        isOpen={showLowStockModal}
        onClose={() => setShowLowStockModal(false)}
      />
    </div>
  );
};

export default DashboardStats;
