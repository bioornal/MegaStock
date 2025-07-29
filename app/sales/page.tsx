"use client";

import { useState, useEffect } from 'react';
import { getProducts } from '@/services/productService';

// Se asume que la interfaz Product está disponible o se define aquí
interface Product {
  id: number;
  name: string;
  brand: string;
  stock: number;
  price: number;
  image: string;
}

const SalesPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Función asíncrona para cargar los datos
    const fetchProducts = async () => {
      try {
        const data = await getProducts(); // Esperar la promesa
        setProducts(data); // Actualizar el estado con los datos resueltos
      } catch (error) {
        console.error("Error al cargar los productos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []); // El array vacío asegura que se ejecute solo una vez

  if (isLoading) {
    return <div className="text-center">Cargando...</div>;
  }

  return (
    <div>
      <h1 className="mb-4">Página de Ventas</h1>
      <p>Esta página está en construcción. Actualmente muestra la lista de productos como prueba de que la carga de datos funciona correctamente.</p>
      <ul className='list-group'>
        {products.map(product => (
          <li key={product.id} className='list-group-item'>{product.name} - <strong>Stock:</strong> {product.stock}</li>
        ))}
      </ul>
    </div>
  );
};

export default SalesPage;
