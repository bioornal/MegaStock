import Navbar from '@/components/Navbar';
import DashboardStats from '@/components/DashboardStats';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="container-fluid">
        <div className="row">
          <aside className="col-md-3 col-lg-2 bg-light p-4 border-end min-vh-100 d-none d-md-block">
            <DashboardStats />
          </aside>
          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
            <div className="pt-3">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
