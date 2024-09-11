import { AnySchema } from 'yup';
import { TooltipOptions } from 'primereact/tooltip/tooltipoptions';

export enum Masks {
  DATEBR = '99/99/9999',
  CPF = '999.999.999-99',
  CNPJ = '99.999.999/9999-99',
  CELULAR = '(99) 9 9999-9999',
  FIXO = '(99) 9999-9999',
  FIXO_OPCIONAL = '(99) 9999-9999?9',
  CEP = '99999-999',
}

export type Shape<Fields = any> = {
  [Key in keyof Fields]: AnySchema<Partial<Fields[Key]>>;
};

export interface JWTToken {
  sub: string;
  iss: string;
  authorities: string[];
  aud: string;
  nbf: number;
  user_id: string;
  produtos: string[];
  scope: string[];
  cpf: string;
  name: string;
  exp: number;
  iat: number;
}

export interface IResponseError {
  status: number;
  timestamp: string;
  type: string;
  title: string;
  detail: string;
  userMessage: string;
}

export interface IActions<T = any> {
  label?: string;
  tooltip?: string;
  tooltipOptions?: TooltipOptions;
  className?: string;
  bgcolor?: string;
  icon?: string;
  command?: (data?: T) => void;
  length?: number | null;
  totalActions?: number | null;
}

export interface IActionTable<T = any> extends IActions<T> {
  template?: (item: IActions<T>, data: T) => React.ReactNode;
}

export interface IClientes {
  id: number;
  nome: string;
  cnpj: string;
  created_at: string;
  status: number;
}