'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NewProductPage() {
  const [name, setName] = useState('');
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name || !stock || !price) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    const { data, error } = await supabase
      .from('products') // Asumo que la tabla se llama 'products'
      .insert([{ 
        name, 
        stock: parseInt(stock, 10), 
        price: parseFloat(price) 
      }]);

    if (error) {
      console.error('Error inserting data:', error);
      alert('Hubo un error al guardar el producto.');
    } else {
      alert('Producto guardado con éxito');
      router.push('/');
    }
  };

  return (
    <main className="container mt-5">
      <h1 className="mb-4">Añadir Nuevo Mueble</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Nombre del Mueble</label>
          <input 
            type="text" 
            className="form-control" 
            id="name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="stock" className="form-label">Stock Inicial</label>
          <input 
            type="number" 
            className="form-control" 
            id="stock" 
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="price" className="form-label">Precio</label>
          <input 
            type="number" 
            step="0.01" 
            className="form-control" 
            id="price" 
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">Guardar</button>
      </form>
    </main>
  );
}
