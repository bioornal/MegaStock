'use client'

import { useState, useEffect } from 'react'
import { Search, Package, AlertCircle } from 'lucide-react'
import { getProducts, Product } from '@/services/productService'

export default function ViewerDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const data = await getProducts()
        setProducts(data)
        setFilteredProducts(data)
      } catch (err) {
        setError('Error al cargar productos')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products)
      return
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.color && product.color.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredProducts(filtered)
  }, [searchTerm, products])

  const getStockBadge = (stock: number) => {
    if (stock === 0) return 'bg-danger'
    if (stock <= 2) return 'bg-warning'
    if (stock <= 5) return 'bg-info'
    return 'bg-success'
  }

  const getStockText = (stock: number) => {
    if (stock === 0) return 'Sin Stock'
    if (stock <= 2) return 'Stock Crítico'
    if (stock <= 5) return 'Stock Bajo'
    return 'Stock Normal'
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando productos...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h4 className="card-title d-flex align-items-center">
                <Package className="me-2" />
                Consulta de Stock - MegaStock
              </h4>
              <p className="card-text mb-0">
                Busca productos por nombre, marca o color para consultar disponibilidad
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="input-group input-group-lg">
                <span className="input-group-text">
                  <Search size={20} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar productos por nombre, marca o color..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <small className="text-muted mt-2 d-block">
                Encontrados: {filteredProducts.length} productos
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <AlertCircle className="me-2" />
          {error}
        </div>
      )}

      {/* Resultados */}
      <div className="row">
        {filteredProducts.length === 0 && !loading && (
          <div className="col-12">
            <div className="text-center py-5">
              <Package size={48} className="text-muted mb-3" />
              <h5 className="text-muted">
                {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
              </h5>
              {searchTerm && (
                <p className="text-muted">
                  Intenta con otros términos de búsqueda
                </p>
              )}
            </div>
          </div>
        )}

        {filteredProducts.map((product) => (
          <div key={product.id} className="col-lg-4 col-md-6 mb-3">
            <div className="card h-100">
              {product.image && (
                <img
                  src={product.image}
                  className="card-img-top"
                  alt={product.name}
                  style={{ height: '200px', objectFit: 'cover' }}
                />
              )}
              <div className="card-body d-flex flex-column">
                <h6 className="card-title">{product.name}</h6>
                <p className="card-text text-muted mb-2">
                  <strong>Marca:</strong> {product.brand}
                </p>
                <p className="card-text text-muted mb-2">
                  <strong>Color:</strong> {product.color}
                </p>
                <p className="card-text mb-2">
                  <strong>Precio:</strong> ${product.price.toLocaleString('es-AR')}
                </p>
                
                <div className="mt-auto">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Stock:</span>
                    <span className={`badge ${getStockBadge(product.stock)} fs-6`}>
                      {product.stock} unidades
                    </span>
                  </div>
                  <small className={`text-${product.stock === 0 ? 'danger' : product.stock <= 2 ? 'warning' : 'success'} mt-1 d-block`}>
                    {getStockText(product.stock)}
                  </small>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer informativo */}
      <div className="row mt-5">
        <div className="col-12">
          <div className="card bg-light">
            <div className="card-body text-center">
              <small className="text-muted">
                <strong>Nota:</strong> Esta vista es solo para consulta de stock. 
                Para realizar ventas o modificar productos, contacta al administrador.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
