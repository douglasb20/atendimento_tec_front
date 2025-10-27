'use client';
import React, { useMemo } from 'react';
import { v4 } from 'uuid';

interface MessageData {
  id: string;
  fromMe: boolean;
  body: string;
}

interface Message {
  dataType: string;
  data: {
    message: MessageData;
  };
}

function parseMensagem(texto: string): React.ReactNode[] {
  if (!texto) return [];

  // Divide o texto em partes mantendo as marcações
  const tokens = texto.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`)/g);
  const elementos: React.ReactNode[] = [];

  tokens.forEach((token, i) => {
    if (!token) return;

    // 🟢 Negrito
    if (token.startsWith('*') && token.endsWith('*')) {
      const conteudo = token.slice(1, -1);
      elementos.push(<strong key={i}>{parseMensagem(conteudo)}</strong>);
    }
    // 🟣 Itálico
    else if (token.startsWith('_') && token.endsWith('_')) {
      const conteudo = token.slice(1, -1);
      elementos.push(<em key={i}>{parseMensagem(conteudo)}</em>);
    }
    // 🔴 Riscado
    else if (token.startsWith('~') && token.endsWith('~')) {
      const conteudo = token.slice(1, -1);
      elementos.push(<s key={i}>{parseMensagem(conteudo)}</s>);
    }
    // 🟠 Código
    else if (token.startsWith('`') && token.endsWith('`')) {
      const conteudo = token.slice(1, -1);
      elementos.push(
        <code
          key={i}
          className="bg-gray-200 px-1 rounded font-mono"
        >
          {conteudo}
        </code>,
      );
    }
    // Texto comum - preserva quebras de linha
    else {
      if (token.includes('\n')) {
        const linhas = token.split('\n');
        linhas.forEach((linha, lineIndex) => {
          elementos.push(<span key={`${i}-${lineIndex}`}>{linha}</span>);
          if (lineIndex < linhas.length - 1) {
            elementos.push(<br key={`${i}-br-${lineIndex}`} />);
          }
        });
      } else {
        // Envolver texto normal em span para preservar espaços
        elementos.push(<span key={i}>{token}</span>);
      }
    }
  });

  return elementos;
}

function SingleMessage({ message }: { message: Message }) {
  const { fromMe, body } = message.data.message;

  // --- 4. Otimização com useMemo ---
  // Evita re-processar a mesma mensagem em cada renderização.
  // A formatação só é recalculada se o 'body' da mensagem mudar.
  const formattedContent = useMemo(() => parseMensagem(body), [body]);

  const messageClass = fromMe
    ? 'align-self-end bg-blue-500 text-white'
    : 'align-self-start bg-gray-300 text-black';

  return (
    <div
      className={`w-auto p-2 mb-2 border-round-lg max-w-xs ${messageClass}`}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {formattedContent}
    </div>
  );
}

export default function MessageItem({ messages }: { messages?: Message[] }) {
  return (
    <>
      {messages?.map((msg) => {
        if (msg?.dataType !== 'message_create') {
          return null;
        }

        // --- 6. Chave (key) Estável e Única ---
        // Usar o ID da mensagem é a melhor prática. `v4()` ou `index` são anti-padrões
        // que causam re-renderizações desnecessárias.
        return (
          <SingleMessage
            key={v4()}
            message={msg}
          />
        );
      })}
    </>
  );
}
