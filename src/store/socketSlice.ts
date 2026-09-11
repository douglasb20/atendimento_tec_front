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
    console.log('🔌 Conectando socket...');
    const cookiesStore = parseCookies(null);
    const token = cookiesStore['token'];
    const socket = io(process.env.WEBSOCKET_HOST || '', {
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

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    socket?.disconnect();
    set({ socket: null });
  },
});
