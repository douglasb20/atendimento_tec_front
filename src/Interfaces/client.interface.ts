import { TagResponse } from './tag.interface';

export type ClientResponse = {
  id: number;
  nome: string;
  cnpj: string;
  created_at: string;
  updated_at: null;
  status: number;
  /** Etiquetas do cliente; só vem nas rotas que carregam a relação. */
  tags?: TagResponse[];
};
