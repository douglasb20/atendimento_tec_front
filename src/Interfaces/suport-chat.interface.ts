import { ContactResponse } from './contact.interface';
import { UserResponse } from './user.interface';

export interface SupportChatsResponse {
  id: string;
  user_id: null;
  channel_id: number;
  contact_id: number;
  support_chat_status_id: number;
  protocol: string;
  unread_count: number;
  last_message: string;
  last_message_type: string;
  last_message_id: string;
  is_waiting: boolean;
  created_at: string;
  updated_at: string;
  supportChatStatus: SupportChatStatus;
  contact: ContactResponse;
  supportChatMessages?: SupportChatMessageResponse[];
  user?: UserResponse;
}

export interface SupportChatMessageResponse {
  id: string;
  support_chat_id: string;
  channel_id: number;
  message_id: string;
  datetime: string;
  ack: number;
  type: string;
  from_me: boolean;
  content: string;
  has_media: boolean;
  media_url: string;
  media_type: string;
  media_size: null;
  from: string;
  to: string;
  device_type: string;
  is_deleted: boolean;
  is_edited: boolean;
  is_gif: boolean;
  has_reaction: boolean;
  reaction: string;
  created_at: string;
  updated_at: string;
}

export type SupportChatsWithMessagesResponse = SupportChatsResponse & {
  supportChatMessages: SupportChatMessageResponse;
};

export type SupportChatStatus = {
  id: number;
  name: string;
  is_final: boolean;
};

export type UnreadMessagesPayload = {
  chatId: string;
  unread_count: number;
};
