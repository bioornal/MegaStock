import Link from 'next/link';
import { Home, Package, Plus, ShoppingCart, FileText } from 'lucide-react';
import AuthButton from './AuthButton';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
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
        <NavbarClient />
      </div>
    </nav>
  );
}
