import Navbar from '@/components/Navbar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="container-fluid">
        {children}
      </div>
    </>
  );
}
