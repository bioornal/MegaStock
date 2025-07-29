'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BRANDS } from '@/lib/constants';

interface AddProductFormProps {
  onProductAdded: () => void;
  onCancel: () => void;
}

export default function AddProductForm({ onProductAdded, onCancel }: AddProductFormProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState(''); // Default to empty to show placeholder
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!name || !brand || !stock || !price) {
      alert('Por favor, completa todos los campos.');
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('products')
      .insert([{ 
        name,
        brand,
        stock: parseInt(stock, 10),
        price: parseFloat(price)
      }]);

    if (error) {
      console.error('Error inserting data:', error);
      alert('Hubo un error al guardar el producto.');
    } else {
      alert('Producto guardado con éxito');
      onProductAdded(); // Llama a la función para refrescar la tabla y cerrar el form
    }
    setIsSubmitting(false);
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h4 className="card-title">Añadir Nuevo Producto</h4>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="name" className="form-label">Nombre del Mueble</label>
              <input type="text" className="form-control" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label htmlFor="brand" className="form-label">Marca</label>
              <select id="brand" className="form-select" value={brand} onChange={(e) => setBrand(e.target.value)} required>
                <option value="" disabled>Selecciona una marca</option>
                {BRANDS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="stock" className="form-label">Stock Inicial</label>
              <input type="number" className="form-control" id="stock" value={stock} onChange={(e) => setStock(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label htmlFor="price" className="form-label">Precio</label>
              <input type="number" step="0.01" className="form-control" id="price" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="col-12 d-flex justify-content-end">
                <button type="button" className="btn btn-secondary me-2" onClick={onCancel}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
