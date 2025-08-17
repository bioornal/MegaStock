import PriceUpdateForm from '@/components/PriceUpdateForm';

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function PriceUpdatePage() {
  return (
    <div className="min-h-screen bg-light">
      <PriceUpdateForm />
    </div>
  );
}
