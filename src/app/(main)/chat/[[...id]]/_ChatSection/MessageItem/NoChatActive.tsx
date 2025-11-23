import { FaComments } from 'react-icons/fa';

export default function NoChatActive() {
  return (
    <div className="flex flex-1 flex-column justify-content-center align-items-center h-full">
      <FaComments
        style={{ fontSize: '9rem' }}
        className="text-green-600"
      />
      <span className="text-gray-500 text-4xl font-semibold line-height-1">
        Mantenha-se conectado
      </span>
      <span className="text-gray-500 text-2xl font-medium ">
        As conversas serão atualizadas em tempo real
      </span>
      <span className="text-gray-500 text-lg pt-2">Selecione um atendimento para começar</span>
    </div>
  );
}
