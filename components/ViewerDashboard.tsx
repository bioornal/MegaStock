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
        setProducts(data || [])
        setFilteredProducts(data || [])
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

    const term = searchTerm.toLowerCase()
    const filtered = products.filter(product => {
      const name = (product.name || '').toLowerCase()
      const brand = (product.brand || '').toLowerCase()
      const color = (product.color || '').toLowerCase()
      return (
        name.includes(term) ||
        brand.includes(term) ||
        color.includes(term)
      )
    })
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
    <div className="container-fluid px-2 mt-3 overflow-hidden" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="row g-2 mb-3">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body py-2">
              <h6 className="card-title d-flex align-items-center mb-1 text-truncate">
                <Package className="me-2" />
                Consulta de Stock
              </h6>
              <small className="card-text mb-0 d-block text-truncate opacity-75">
                Busca por nombre, marca o color
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="row g-2 mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body py-2">
              <div className="input-group w-100">
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
              <small className="text-muted mt-2 d-block text-truncate">
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

      {/* Resultados en lista compacta */}
      <div className="row g-2">
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

        <div className="col-12">
          <div className="list-group">
            {filteredProducts.map((product) => (
              <div key={product.id} className="list-group-item py-2 px-2 overflow-hidden">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1 me-2 overflow-hidden">
                    <div className="fw-semibold text-truncate" title={product.name}>{product.name}</div>
                    <small className="text-muted text-truncate d-block">
                      {product.color ?? ''}
                    </small>
                  </div>
                  <div className="text-end ms-2" style={{ whiteSpace: 'nowrap' }}>
                    <div className="small fw-semibold mb-1">
                      {typeof product.price === 'number' ? `$${product.price.toLocaleString('es-AR')}` : '-'}
                    </div>
                    <span className={`badge rounded-pill ${getStockBadge(product.stock)}`}>{product.stock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer informativo */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card bg-light">
            <div className="card-body text-center py-2">
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

