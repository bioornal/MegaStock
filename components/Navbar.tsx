import Link from 'next/link';
import { Package } from 'lucide-react';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm" style={{ background: 'var(--ms-bg-base)', borderBottom: '1px solid var(--ms-border)' }}>
      <div className="container-fluid">
        <Link href="/" className="navbar-brand d-flex align-items-center gap-2">
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--ms-radius-sm)',
            background: 'linear-gradient(135deg, var(--ms-accent) 0%, #a29bfe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Package size={18} color="#fff" />
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, letterSpacing: '-0.03em', fontSize: '1.2rem' }}>
            MegaStock
          </span>
        </Link>
        <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <NavbarClient />
      </div>
    </nav>
  );
}
