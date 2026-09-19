import { io } from 'socket.io-client';
import type { StateCreator } from 'zustand';
import { SocketSlice, MessageSlice, ChatSlice } from '@/Interfaces';
import { renovaSessao } from '@/service/Api/sessaoViva';

export const createSocketSlice: StateCreator<
  SocketSlice & MessageSlice & ChatSlice,
  [],
  [],
  SocketSlice
> = (set, get) => ({
  socket: null,

  connect: () => {
    // Reconectar por cima do que já existe deixaria o socket anterior órfão,
    // ainda recebendo eventos que ninguém trata.
    const atual = get().socket;
    if (atual?.connected) return;
    atual?.disconnect();

    const socket = io(process.env.WEBSOCKET_HOST || '', {
      autoConnect: false,
      // O token não vai mais em `auth`: é um cookie httpOnly, que o JavaScript
      // não consegue ler. Com `withCredentials` o navegador o envia no
      // handshake, e o gateway o extrai do cabeçalho `Cookie`.
      withCredentials: true,
      // Vai direto a WebSocket em vez de começar em long-polling e migrar.
      // O padrão do Socket.IO é `['polling', 'websocket']`, e o polling mantém
      // um ciclo de requisições HTTP abertas - visível no Network como várias
      // chamadas `?transport=polling` com o mesmo `sid`. O servidor aceita
      // WebSocket (responde 101), então não há motivo para o intermediário.
      transports: ['websocket'],
    });

    // Renova antes de tentar de novo.
    //
    // O gateway valida o JWT apenas no handshake: uma conexão já aberta nunca
    // é derrubada por vencimento. O `jwt expired` do log é sempre de uma
    // *reconexão* — a máquina dormiu, a rede oscilou —, em que o navegador
    // reenvia o mesmo cookie, agora vencido. O Socket.IO então insiste em
    // silêncio, e o portal fica sem eventos até alguém recarregar a página.
    socket.io.on('reconnect_attempt', () => {
      renovaSessao().catch(() => {
        // Sem sessão recuperável, deixa a tentativa seguir: o gateway recusa e
        // o middleware manda para o login na navegação seguinte.
      });
    });

    socket.connect();
    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    socket?.disconnect();
    set({ socket: null });
  },
});
