import { io } from 'socket.io-client';
import type { StateCreator } from 'zustand';
import { parseCookies } from 'nookies';
import { SocketSlice, MessageSlice, ChatSlice } from '@/Interfaces';

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

    const token = parseCookies(null)['token'];

    const socket = io(process.env.WEBSOCKET_HOST || '', {
      autoConnect: false,
      auth: { token },
      // Vai direto a WebSocket em vez de começar em long-polling e migrar.
      // O padrão do Socket.IO é `['polling', 'websocket']`, e o polling mantém
      // um ciclo de requisições HTTP abertas — visível no Network como várias
      // chamadas `?transport=polling` com o mesmo `sid`. O servidor aceita
      // WebSocket (responde 101), então não há motivo para o intermediário.
      transports: ['websocket'],
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
