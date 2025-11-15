import { create } from 'zustand';
import { createSocketSlice } from './socketSlice';
import { createMessageSlice } from './messageSlice';
import { createChatSlice } from './chatSlice';
import { ChatStore } from '@/Interfaces';

export const useChatStore = create<ChatStore>()((...a) => ({
  ...createSocketSlice(...a),
  ...createMessageSlice(...a),
  ...createChatSlice(...a),
}));
