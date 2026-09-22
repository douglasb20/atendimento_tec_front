export type UserResponse = {
  id: number;
  name: string;
  last_name?: string | null;
  email: string;
  valor_hora: string;
  avatar_url: string;
  is_requestpassword: number;
  created_at: string;
  lastlogin_at: string;
  role: string;
  is_superuser: number;
  status: number;
};
