/** Etiqueta colorida para classificar clientes. */
export type TagResponse = {
  id: number;
  name: string;
  /** Cor em `#RRGGBB`. */
  color: string;
  /** Cor do texto sobre o fundo, escolhida no cadastro. */
  text_color: 'light' | 'dark';
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};
