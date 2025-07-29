"use client";

import { useState, useEffect } from 'react';
import { getProducts } from '@/services/productService';
import { Package, Archive, AlertTriangle, DollarSign } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <div className={`card text-white mb-3 bg-${color} shadow-sm`}>
    <div className="card-body d-flex align-items-center">
      {icon}
      <div className='ms-3'>
        <h5 className="card-title mb-1">{value}</h5>
        <p className="card-text mb-0 small">{title}</p>
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

  const fetchStats = async () => {
    try {
      const products = await getProducts();
      const total = products.reduce((sum, product) => sum + product.stock, 0);
      const lowStock = products.filter(p => p.stock < 3).length;
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
        title="Bajo Stock (<3)" 
        value={lowStockProducts} 
        icon={<AlertTriangle size={30} />} 
        color="warning" 
      />
    </div>
  );
};

export default DashboardStats;
