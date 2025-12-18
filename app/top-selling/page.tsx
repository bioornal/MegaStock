'use client';

import TopSellingProductsCard from '@/components/TopSellingProductsCard';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TopSellingPage() {
    const router = useRouter();

    return (
        <div className="container-fluid py-4">
            <div className="d-flex align-items-center mb-4">
                <button
                    className="btn btn-outline-secondary me-3"
                    onClick={() => router.back()}
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="mb-0 fw-bold">Productos Más Vendidos</h2>
            </div>

            <div className="row">
                <div className="col-12 col-md-10 col-lg-8 mx-auto">
                    {/* Reutilizamos el componente existente que ya tiene filtros */}
                    <TopSellingProductsCard />

                    <div className="alert alert-info mt-4" role="alert">
                        <h5 className="alert-heading text-primary">ℹ️ Sobre los datos mostrados</h5>
                        <p className="mb-0 small text-muted">
                            Los datos que visualiza provienen directamente de la base de datos de ventas registradas.
                            Si observa productos que no recuerda haber vendido (como "Almohadas Smart"), estos pueden corresponder a datos históricos o de prueba almacenados anteriormente en el sistema.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
