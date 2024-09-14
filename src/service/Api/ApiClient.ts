'use client';
import axios from 'axios';
import { parseCookies } from 'nookies';

const url = process.env.URL_ENDPOINT;

interface ILoginResp {
  access_token: string;
}

/**
 * Função para transformar url com variavel na string
 * @param {string} url url que será ajeitado
 * @param {string[]} params dados que vai ajeitar o url
 */
export const AjeitaUrl = (url, params) => {
  let paramsUrl = url.match(/{{([a-z_]+)}}/gi);
  let newUrl = url;

  if (!paramsUrl || paramsUrl.length === 0) {
    return newUrl;
  }

  if (paramsUrl.length !== params.length) {
    throw new Error('Quantidade de parametros não corresponde com parametros do url');
  }

  paramsUrl.forEach((val, key) => {
    newUrl = newUrl.replace(val, params[key]);
  });

  return newUrl;
};

export default function ApiClient() {
  const cookiesStore = parseCookies(null);
  const token = cookiesStore['token'];

  const req = axios.create({
    baseURL: url,
    headers: { Authorization: 'Bearer ' + token },
  });

  const apiLogin = async (email: string, password: string): Promise<ILoginResp> => {
    return new Promise<ILoginResp>(async (res, rej) => {
      try {
        const { data } = await req.post<ILoginResp>('/auth/signin', { email, password });
        res(data);
      } catch (error) {
        rej(error);
      }
    });
  };

  const ListUrl = {
    ListarClientes: { url: '/clients', method: 'GET' },
    CriarCliente: { url: '/clients', method: 'POST' },
    AtualizarCliente: { url: '/clients/{{client_id}}', method: 'PATCH' },
    RemoverCliente: { url: '/clients/{{client_id}}', method: 'DELETE' },
    BuscarClienteId: { url: '/clients/{{client_id}}', method: 'GET' },
    ForgottenPassword: { url: '/auth/forgotten_password/{{email}}', method: 'POST' },
    RemoveContact: { url: '/clients/{{client_id}}/contact/{{contact_id}}', method: 'DELETE' },
  } as const;

  /**
   * Função para retornar dados das API's
   */
  const FetchReq = async <T = unknown>(
    props:
      | keyof typeof ListUrl
      | {
          endpoint: keyof typeof ListUrl;
          variables?: (string | number)[];
          body?: unknown;
        },
    vars: (string | number)[] = [],
  ): Promise<T> => {
    if (typeof props === 'string') {
      props = { endpoint: props, body: null, variables: vars };
    }
    const { endpoint, body, variables } = props;
    const newUrl = AjeitaUrl(ListUrl[endpoint].url, variables);

    const { data } = await req({
      url: newUrl,
      method: ListUrl[endpoint].method,
      data: ListUrl[endpoint].method === 'GET' ? null : body,
    });

    return data;
  };

  return {
    req,
    apiLogin,
    FetchReq,
    baseUrl: url,
    token: token,
    ...ListUrl,
  };
}
