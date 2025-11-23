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

  const apiRefreshToken = async (refreshToken: string): Promise<ILoginResp> => {
    return new Promise<ILoginResp>(async (res, rej) => {
      try {
        const { data } = await req.post<ILoginResp>('/auth/refresh', { refreshToken });
        res(data);
      } catch (error) {
        rej(error);
      }
    });
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
      console.error('API Request Error:', err.request);
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
