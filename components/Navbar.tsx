import Link from 'next/link';
import { Home, Package, Plus, ShoppingCart } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
      <div className="container-fluid">
        <Link href="/" className="navbar-brand d-flex align-items-center">
          <Package className="me-2" />
          <strong>MegaStock</strong>
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link href="/" className="nav-link d-flex align-items-center active">
                <Home className="me-1" size={20} />
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/" className="nav-link d-flex align-items-center">
                <Package className="me-1" size={20} />
                Productos
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/sales" className="nav-link d-flex align-items-center">
                <ShoppingCart className="me-1" size={20} />
                Ventas
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/stock" className="nav-link d-flex align-items-center">
                <Plus className="me-1" size={20} />
                Actualizar Stock
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
