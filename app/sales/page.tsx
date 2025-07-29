"use client";

import { useState, useEffect } from "react";
import { getProducts, registerSale, brands } from "@/services/productService";

interface Product {
  id: number;
  name: string;
  brand: string;
  stock: number;
  price: number;
  image: string;
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [message, setMessage] = useState<string>("...");
  
  // Cargar productos
  useEffect(() => {
    setProducts(getProducts());
  }, []);
  
  // Obtener producto seleccionado
  const product = products.find(p => p.id === selectedProduct) || null;
  
  // Manejar el registro de venta
  const handleSale = () => {
    if (!selectedProduct) {
      setMessage("Por favor seleccione un producto");
      return;
    }
    
    if (quantity <= 0) {
      setMessage("La cantidad debe ser mayor a 0");
      return;
    }
    
    try {
      const updatedProduct = registerSale(selectedProduct, quantity);
      
      // Actualizar la lista de productos
      setProducts(products.map(p => p.id === selectedProduct ? updatedProduct : p));
      
      setMessage(`Venta registrada: ${quantity} unidad(es) de ${updatedProduct.name}`);
      
      // Resetear formulario
      setSelectedProduct(null);
      setQuantity(1);
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  return (
    <main className="container mt-5">
      <h1 className="mb-4">Registrar Venta</h1>
      
      <div className="card p-4">
        <div className="mb-3">
          <label htmlFor="productSelect" className="form-label">Producto:</label>
          <select 
            id="productSelect" 
            className="form-select" 
            value={selectedProduct || ""}
            onChange={(e) => setSelectedProduct(Number(e.target.value))}
          >
            <option value="">Seleccione un producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {product.brand} (Stock: {product.stock})
              </option>
            ))}
          </select>
        </div>
        
        {product && (
          <div className="mb-3">
            <label htmlFor="quantityInput" className="form-label">
              Cantidad (Disponible: {product.stock}):
            </label>
            <input 
              type="number" 
              id="quantityInput" 
              className="form-control" 
              min="1" 
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
            />
          </div>
        )}
        
        <button 
          className="btn btn-primary" 
          onClick={handleSale}
          disabled={!selectedProduct}
        >
          Registrar Venta
        </button>
        
        {message && (
          <div className="mt-3 alert alert-info">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
