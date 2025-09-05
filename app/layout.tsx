  import type { Metadata } from "next";
import { Inter } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.min.css';
import './theme.css';
import BootstrapClient from "@/components/BootstrapClient";
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
      <body className={inter.className}>
        <BootstrapClient />
        {children}
      </body>
    </html>
  );
}
