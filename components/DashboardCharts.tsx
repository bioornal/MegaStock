"use client";

import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { getProducts } from '@/services/productService';
import { Product } from '@/services/productService';
import { TrendingUp, Package, DollarSign } from 'lucide-react';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// Genera una paleta de colores dinámica según la cantidad requerida
const generateColors = (count: number) => {
  // Paleta base para los primeros colores, luego se generan en HSL
  const base = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
  ];
  if (count <= base.length) return base.slice(0, count);
  const colors = [...base];
  for (let i = colors.length; i < count; i++) {
    const hue = Math.round((360 / count) * i);
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  return colors;
};

const DashboardCharts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products for charts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Configuración común para gráficos
  const chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Gráfico por marcas (distribución de productos)
  const getBrandDistribution = () => {
    const brandCount: { [key: string]: number } = {};
    products.forEach(product => {
      brandCount[product.brand] = (brandCount[product.brand] || 0) + 1;
    });

    const sortedBrands = Object.entries(brandCount)
      .sort(([,a], [,b]) => b - a); // Mostrar todas las marcas

    return {
      labels: sortedBrands.map(([brand]) => brand),
      datasets: [{
        data: sortedBrands.map(([, count]) => count),
        backgroundColor: generateColors(sortedBrands.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  // Gráfico por valor de inventario por marca
  const getInventoryValueByBrand = () => {
    const brandValue: { [key: string]: number } = {};
    products.forEach(product => {
      const value = product.price * product.stock;
      brandValue[product.brand] = (brandValue[product.brand] || 0) + value;
    });

    const sortedBrands = Object.entries(brandValue)
      .sort(([,a], [,b]) => b - a); // Mostrar todas las marcas

    return {
      labels: sortedBrands.map(([brand]) => brand),
      datasets: [{
        data: sortedBrands.map(([, value]) => Math.round(value)),
        backgroundColor: generateColors(sortedBrands.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  // Gráfico de distribución de stock
  const getStockDistribution = () => {
    const stockRanges = {
      'Sin Stock (0)': 0,
      'Crítico (1-2)': 0,
      'Bajo (3-5)': 0,
      'Normal (6-10)': 0,
      'Alto (11+)': 0
    };

    products.forEach(product => {
      if (product.stock === 0) {
        stockRanges['Sin Stock (0)']++;
      } else if (product.stock <= 2) {
        stockRanges['Crítico (1-2)']++;
      } else if (product.stock <= 5) {
        stockRanges['Bajo (3-5)']++;
      } else if (product.stock <= 10) {
        stockRanges['Normal (6-10)']++;
      } else {
        stockRanges['Alto (11+)']++;
      }
    });

    return {
      labels: Object.keys(stockRanges),
      datasets: [{
        data: Object.values(stockRanges),
        backgroundColor: [
          '#FF4757', // Rojo para sin stock
          '#FF6B35', // Naranja para crítico
          '#FFA726', // Amarillo para bajo
          '#66BB6A', // Verde para normal
          '#42A5F5'  // Azul para alto
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando gráficos...</span>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <Package size={48} className="mb-3" />
        <p>No hay datos suficientes para mostrar gráficos</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h5 className="mb-3 fw-bold d-flex align-items-center">
        <TrendingUp size={20} className="me-2" />
        Análisis de Inventario
      </h5>

      {/* Gráfico de distribución por marcas */}
      <div className="card mb-3 shadow-sm">
        <div className="card-header bg-primary text-white py-2">
          <h6 className="mb-0 d-flex align-items-center">
            <Package size={16} className="me-2" />
            Productos por Marca
          </h6>
        </div>
        <div className="card-body" style={{ height: '250px' }}>
          <Pie data={getBrandDistribution()} options={chartOptions} />
        </div>
      </div>

      {/* Gráfico de valor de inventario por marca */}
      <div className="card mb-3 shadow-sm">
        <div className="card-header bg-success text-white py-2">
          <h6 className="mb-0 d-flex align-items-center">
            <DollarSign size={16} className="me-2" />
            Valor por Marca
          </h6>
        </div>
        <div className="card-body" style={{ height: '250px' }}>
          <Pie data={getInventoryValueByBrand()} options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed;
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${label}: $${value.toLocaleString('es-CL')} (${percentage}%)`;
                  }
                }
              }
            }
          }} />
        </div>
      </div>

      {/* Gráfico de distribución de stock */}
      <div className="card mb-3 shadow-sm">
        <div className="card-header bg-warning text-dark py-2">
          <h6 className="mb-0 d-flex align-items-center">
            <TrendingUp size={16} className="me-2" />
            Distribución de Stock
          </h6>
        </div>
        <div className="card-body" style={{ height: '250px' }}>
          <Pie data={getStockDistribution()} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
