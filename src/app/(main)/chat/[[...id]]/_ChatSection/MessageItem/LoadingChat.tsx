import { ProgressSpinner } from 'primereact/progressspinner';

export default function LoadingChat() {
  return (
    <div className="flex flex-column flex-1 justify-content-center align-items-center gap-2">
      <ProgressSpinner />
      <span className="text-center text-lg">Carregando conversa, por favor aguarde...</span>
    </div>
  );
}
