'use client';
import React from 'react';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';

import useApi from '@/service/Api/ApiClient';

export default function SendMessageBox() {
  const { FetchReq } = useApi();
  const [text, setText] = React.useState('');

  const handleSendMessage = async () => {
    // Implement message sending logic here
    const dataPost = {
      to: '556492698043@c.us',
      message: '*Atendente:*\n' + text.trim(),
    };

    await FetchReq({
      endpoint: 'SendMessage',
      body: dataPost,
    });
    setText('');
  };

  return (
    <div className="flex flex-row w-full p-fluid gap-2 py-2 items-end">
      <InputTextarea
        autoResize
        onKeyDown={(e) => {
          // Verifica se a tecla é 'Enter' E se a tecla Shift NÃO está pressionada.
          if (e.key === 'Enter' && !e.shiftKey) {
            // 1. Previne o comportamento padrão do Enter (que é criar uma nova linha).
            e.preventDefault();
            // 2. Chama a função para enviar a mensagem.
            handleSendMessage();
          }
          // Se for Shift + Enter, o código dentro do 'if' não roda,
          // e o comportamento padrão (criar nova linha) acontece normalmente.
        }}
        className="w-full max-h-15rem "
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Digite sua mensagem..."
        rows={1}
      />
      <Button
        className="w-auto align-self-center"
        label="Enviar"
        onClick={handleSendMessage}
        disabled={text.trim() === ''}
      />
    </div>
  );
}
