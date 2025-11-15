import { ClientResponse } from "./client.interface";

export type ContactResponse =  {
  id: number;
  client_id: null;
  name: string;
  avatar_url: string;
  is_avatar_external: number;
  tags: null;
  phone: string;
  remote_jid: string;
  created_at: string;
  updated_at: string;
  status: number;
  client: ClientResponse | null;
}