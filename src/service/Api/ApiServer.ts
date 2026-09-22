import axios from 'axios';
import { cookies } from 'next/headers';
import { ListUrl } from './ApiClient';

import { ILoginResp } from '@/Interfaces';

const url = process.env.URL_ENDPOINT;

/**
 * Função para transformar url com variável na string
 * @param {string} url url que será ajeitado
 * @param {string[]} params dados que vai ajeitar o url
 */
export const AjeitaUrl = (url: string, params: (string | number)[]): string => {
  let paramsUrl = url.match(/{{([a-z_]+)}}/gi);
  let newUrl = url;

  if (!paramsUrl || paramsUrl.length === 0) {
    return newUrl;
  }

  if (paramsUrl.length !== params.length) {
    throw new Error('Quantidade de parâmetros não corresponde com parâmetros do url');
  }

  paramsUrl.forEach((val, key) => {
    newUrl = newUrl.replace(val, String(params[key]));
  });

  return newUrl;
};

export default async function ApiService() {
  const cookiesStore = await cookies();
  const token = cookiesStore.get('token')?.value;

  const req = axios.create({
    baseURL: url,
    headers: { Authorization: 'Bearer ' + token },
  });

  /**
   * Renova a sessão e devolve os `Set-Cookie` emitidos pela API.
   *
   * Os tokens são httpOnly e quem os emite é o backend; o chamador (o
   * middleware) precisa repassar esses cabeçalhos ao navegador, senão a
   * renovação acontece no servidor e o cliente nunca recebe os cookies novos.
   *
   * O refresh vai no cabeçalho `Cookie` porque o axios do servidor não
   * compartilha o cookie jar do navegador - aqui ele é montado à mão.
   */
  const apiRefreshToken = async (refreshToken: string): Promise<string[]> => {
    const resposta = await req.post<ILoginResp>(
      '/auth/refresh',
      {},
      { headers: { Cookie: `refresh_token=${refreshToken}` } },
    );

    return resposta.headers['set-cookie'] ?? [];
  };

  /**
   * Função para retornar dados das API's
   */
  const FetchReq = async <T>(
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
    try {
      const newUrl = AjeitaUrl(ListUrl[endpoint].url, variables);
      console.log('API Request:', ListUrl[endpoint].method, newUrl, body);
      const { data } = await req({
        url: newUrl,
        method: ListUrl[endpoint].method,
        data: ListUrl[endpoint].method === 'GET' ? null : body,
      });

      return data;
    } catch (err) {
      throw err;
    }
  };

  return {
    req,
    apiRefreshToken,
    FetchReq,
    baseUrl: url,
    token: token,
  };
}
