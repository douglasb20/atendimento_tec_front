import { Socket } from 'socket.io-client';

export type SocketSlice = {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
};

export type MessageSlice = {
  messages: Message[];
  unreadMessages: Message[];
  addMessage: (msg: Message) => void;
  markAsRead: (messageId: string) => void;
};

export type MessageData = {
  id: string;
  fromMe: boolean;
  body: string;
};

export interface Message {
  dataType: string;
  data: {
    message: MessageData;
  };
}
