import { Metadata } from 'next';
import DadosClientesSection from './DadosClientesSection';

export const metadata: Metadata = {
  title: "Clientes"
}

export default function ClientesPage() {
  return (
    <div className="grid">
      <div className="col-8 col-offset-2 card flex flex-column justify-content-center shadow-1">
        <DadosClientesSection />
      </div>
    </div>
  );
}
