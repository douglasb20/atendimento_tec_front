import { io } from 'socket.io-client';
import type { StateCreator } from 'zustand';
import { MessageSlice, SocketSlice } from '../../types';
import { parseCookies } from 'nookies';

export const createSocketSlice: StateCreator<SocketSlice & MessageSlice, [], [], SocketSlice> = (
  set,
  get,
) => ({
  socket: null,

  connect: () => {
    console.log('🔌 Conectando socket...');
    const cookiesStore = parseCookies(null);
    const token = cookiesStore['token'];
    const socket = io('http://localhost:3001', {
      autoConnect: false, // Impede a conexão automática na inicialização
      auth: {
        token,
      },
    });

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => console.log('✅ Socket conectado'));
    socket.on('disconnect', () => console.log('❌ Socket desconectado'));

    // Recebe mensagens do servidor e adiciona ao estado global
    socket.on('whatsapp:messages', (msg) => {
      console.log('📩 Mensagem recebida via socket:', msg);
      get().addMessage(msg);
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    socket?.disconnect();
    set({ socket: null });
  },
});
