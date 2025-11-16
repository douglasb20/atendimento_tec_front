export default function NotFoundChat() {
  return (
    <div className="flex flex-1 flex-column justify-content-center align-items-center h-full">
      <i
        style={{ fontSize: '9rem' }}
        className="fa-light fa-circle-xmark text-red-600 mb-4"
      ></i>
      <span className="text-gray-500 text-3xl font-semibold line-height-1">
        Conversa não encontrada
      </span>
      <span className="text-gray-500 text-3xl font-medium ">
        A conversa pode ter sido privada ou não está mais disponível
      </span>
      <span className="text-gray-500 text-lg ">
        Verifique o endereço digitado e tente novamente
      </span>
    </div>
  );
}
