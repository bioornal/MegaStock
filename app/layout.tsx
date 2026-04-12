  import type { Metadata } from "next";
import 'bootstrap/dist/css/bootstrap.min.css';
import './theme.css';
import BootstrapClient from "@/components/BootstrapClient";

export const metadata: Metadata = {
  title: "MegaStock - Gestion de Inventario",
  description: "Sistema de gestion de inventario y ventas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-bs-theme="dark">
      <body>
        <BootstrapClient />
        {children}
      </body>
    </html>
  );
}
