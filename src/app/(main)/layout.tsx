'use client';
import { useEffect, useRef } from 'react';

import ChatInterno from '@/app/(main)/chat/[[...id]]/_ChatInterno';
import AlertasNaTela from '@/components/AlertasNaTela';
import ModalAlteraSenha from '@/components/ModalAlteraSenha';
import Layout from '@/layout/layout';
import { iniciarRenovacaoDeSessao, pararRenovacaoDeSessao } from '@/service/Api/sessaoViva';
import { useChatStore } from '@/store/useChatStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Renovação proativa da sessão, para todo o portal - não só o chat. Sem ela a
  // renovação dependia de haver uma chamada HTTP acontecendo, e uma aba parada
  // esperando mensagem não faz nenhuma.
  useEffect(() => {
    iniciarRenovacaoDeSessao();
    return pararRenovacaoDeSessao;
  }, []);

  /**
   * O socket vive aqui, e não mais em `chat/layout.tsx`.
   *
   * O chat interno recebe mensagem em qualquer tela: com a conexão presa a
   * `/chat`, quem estivesse em Clientes não seria avisado de nada e o popup
   * flutuante ficaria mudo.
   *
   * Não reconecta ao navegar entre telas - o layout não desmonta, e o
   * `connect()` ignora chamada com socket já conectado. De quebra, o chat de
   * atendimento deixou de refazer o handshake a cada entrada e saída de
   * `/chat`.
   */
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  // O som subiu junto com a conexão: o chat interno avisa de qualquer tela, e
  // com o elemento preso a `/chat` não haveria o que tocar fora dela.
  useEffect(() => {
    if (audioRef.current) useChatStore.setState({ notificationSound: audioRef.current });
  }, []);

  // TEMPORÁRIO: o React passa a pilha de COMPONENTES como último argumento do
  // aviso. É ela que nomeia o culpado, ao contrário do stack de execução.
  if (typeof window !== 'undefined' && !(window as any).__patchKey2) {
    (window as any).__patchKey2 = true;
    const original = console.error;
    console.error = (...args: unknown[]) => {
      if (String(args[0]).includes('unique "key"')) {
        original('### PILHA DE COMPONENTES ###');
        original(args[args.length - 1]);
      }
      original(...args);
    };
  }

  return (
    <>
      <audio
        ref={audioRef}
        id="notification-sound"
      >
        <source
          src="/audio/notification.mp3"
          type="audio/mp3"
        />
      </audio>

      <ModalAlteraSenha />
      {/* Fora do `Layout` e em portal: a janela flutuante precisa sobreviver à
          navegação entre telas, e é aqui que o hook do chat interno assina os
          eventos de socket - uma vez só em toda a aplicação. */}
      <ChatInterno />
      {/* Os avisos com o portal na frente - o do navegador cobre a aba em
          segundo plano. Aqui para aparecer em qualquer tela. */}
      <AlertasNaTela />
      <Layout>{children}</Layout>
    </>
  );
}
