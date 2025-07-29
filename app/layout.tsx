  import type { Metadata } from "next";
import { Inter } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from "@/components/Navbar";
import DashboardStats from "@/components/DashboardStats";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MegaStock - Gestión de Inventario",
  description: "Sistema de gestión de inventario y ventas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className} style={{ backgroundColor: '#f8f9fa' }}>
        <Navbar />
        <div className="container-fluid">
          <div className="row">
            <aside className="col-md-3 col-lg-2 bg-light p-4 border-end min-vh-100">
              <DashboardStats />
            </aside>
            <main className="col-md-9 col-lg-10 p-4">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
