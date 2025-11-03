import { create } from 'zustand';
import { createSocketSlice } from './socketSlice';
import { createMessageSlice } from './messageSlice';
import { MessageSlice, SocketSlice } from '../../types';

export const useChatStore = create<SocketSlice & MessageSlice>()((...a) => ({
  ...createSocketSlice(...a),
  ...createMessageSlice(...a),
}));
