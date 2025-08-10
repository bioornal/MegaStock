import Navbar from '@/components/Navbar';

export default function SalesRegistryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="container-fluid">{children}</div>
    </>
  );
}
