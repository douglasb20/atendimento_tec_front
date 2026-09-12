import { ClientResponse } from './client.interface';

export type ContactResponse = {
  id: number;
  client_id: number | null;
  name: string;
  avatar_url: string;
  is_avatar_external: number;
  tags: string | null;
  phone: string;
  remote_jid: string;
  created_at: string;
  updated_at: string;
  status: number;
  client: ClientResponse | null;
};
