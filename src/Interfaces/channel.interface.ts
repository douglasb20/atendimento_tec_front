export type ChannelResponse = {
  id: number;
  name: string;
  phone_number: string;
  session_id: string;
  channel_status_id: number;
  qr_code: string | null;
  is_connected: number;
  connected_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  channelStatus: ChannelStatus;
};

type ChannelStatus = {
  id: number;
  name: string;
};