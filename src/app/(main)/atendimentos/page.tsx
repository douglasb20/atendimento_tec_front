import { Metadata } from 'next';
import DadosClientesSection from './DadosAtendimentosSection';

export const metadata: Metadata = {
  title: "Atendimentos",
};

export default function AtendimentosPage() {
  return (
    <div className="grid">
      <div className="col-12 card flex flex-column justify-content-center shadow-1">
        <DadosClientesSection />
      </div>
    </div>
  );
}
