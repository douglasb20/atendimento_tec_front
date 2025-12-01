import axios from 'axios';
import { parseCookies, setCookie } from 'nookies';
import { jwtDecode } from 'jwt-decode';
import { ILoginResp, JWTToken } from '@/Interfaces';

const url = process.env.URL_ENDPOINT;

export const ListUrl = {
  ListarClientes: { url: '/clients', method: 'GET' },
  CriarCliente: { url: '/clients', method: 'POST' },
  AtualizarCliente: { url: '/clients/{{client_id}}', method: 'PATCH' },
  RemoverCliente: { url: '/clients/{{client_id}}', method: 'DELETE' },
  BuscarClienteId: { url: '/clients/{{client_id}}', method: 'GET' },
  BuscarContatoClientId: { url: '/clients/{{client_id}}/contact', method: 'GET' },

  ListarContatos: { url: '/contacts', method: 'GET' },
  AdicionarContato: { url: '/contacts', method: 'POST' },
  AtualizarContato: { url: '/contacts/{{contact_id}}', method: 'PATCH' },
  RemoverContato: { url: '/contacts/{{contact_id}}', method: 'DELETE' },

  ListarUsuarios: { url: '/users', method: 'GET' },
  BuscarUsuarioPorId: { url: '/users/{{user_id}}', method: 'GET' },
  AdicionarUsuario: { url: '/users', method: 'POST' },
  AtualizarUsuario: { url: '/users/{{user_id}}', method: 'PATCH' },
  RemoverUsuario: { url: '/users/{{user_id}}', method: 'DELETE' },
  AssinarAvatarUsuario: { url: '/users/sign-avatar', method: 'POST' },

  ListarAtendimentos: { url: '/supports', method: 'GET' },
  ListarAtendimentosPorData: {
    url: '/supports/{{user_id}}/filter?dataInicio={{dataInicio}}&dataFim={{dataFim}}',
    method: 'GET',
  },
  ListarAtendimentoStatus: { url: '/supports/status', method: 'GET' },
  BuscarAtendimento: { url: '/supports/{{support_id}}', method: 'GET' },
  BuscarAtendimentoUserId: { url: '/supports/get_by_user/{{user_id}}', method: 'GET' },
  AdicionarAtendimento: { url: '/supports', method: 'POST' },
  AtualizarAtendimento: { url: '/supports/{{support_id}}', method: 'PATCH' },
  RemoverAtendimento: { url: '/supports/{{support_id}}', method: 'DELETE' },

  ListarCanais: { url: '/channels', method: 'GET' },
  BuscarCanal: { url: '/channels/{{channel_id}}', method: 'GET' },
  AdicionarCanal: { url: '/channels', method: 'POST' },
  AtualizarCanal: { url: '/channels/{{channel_id}}', method: 'PATCH' },
  RemoverCanal: { url: '/channels/{{channel_id}}', method: 'DELETE' },
  IniciarSessao: { url: '/channels/{{channel_id}}/start', method: 'GET' },
  FinalizarSessao: { url: '/channels/{{channel_id}}/terminate', method: 'GET' },

  ListarServicos: { url: '/services', method: 'GET' },
  UserInfo: { url: '/users/info', method: 'GET' },

  ListarAtendimentosSuporte: { url: '/support-chats', method: 'GET' },
  ListarMensagensPorAtendimentoId: { url: '/support-chats/{{chat_id}}/messages', method: 'GET' },

  SendMessage: { url: '/support-chats/send-message', method: 'POST' },
  SendReaction: { url: '/support-chats/{{chat_id}}/send-reaction', method: 'POST' },

  ForgottenPassword: { url: '/auth/forgotten_password/{{email}}', method: 'POST' },
};

/**
 * Função para transformar url com variável na string
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
    throw new Error('Quantidade de parâmetros não corresponde com parâmetros do url');
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

  const UpdateToken = async (refreshToken: string) => {
    const { access_token, refresh_token } = await apiRefreshToken(refreshToken);
    const decodedToken = jwtDecode<JWTToken>(access_token);
    const decodedRefresh = jwtDecode<Pick<JWTToken, 'exp'>>(refresh_token);

    setCookie(null, 'token', access_token, {
      maxAge: decodedToken.exp + 60 * 5 - Math.floor(Date.now() / 1000.0),
      path: '/',
    });
    setCookie(null, 'refresh_token', refresh_token, {
      maxAge: decodedRefresh.exp - Math.floor(Date.now() / 1000.0),
      path: '/',
    });
    setCookie(null, 'expires_at', decodedToken.exp.toString(), {
      maxAge: 20000,
      path: '/',
    });

    return access_token;
  };

  const ValidateToken = async (): Promise<string> => {
    return new Promise(async (res) => {
      const cookiesStore = parseCookies(null);
      const refreshToken = cookiesStore['refresh_token'];
      const now = Math.floor(new Date().getTime() / 1000.0);
      const expires_at = cookiesStore['expires_at'];
      const token = cookiesStore['token'];

      if (!token) {
        const refreshDecoded = jwtDecode<Pick<JWTToken, 'exp'>>(refreshToken);
        if (Number(refreshDecoded.exp) >= now) {
          try {
            const newToken = await UpdateToken(refreshToken);
            res(newToken);
          } catch (err) {
            window.location.href = '/auth/logout';
          }
        }
      } else {
        if (Number(expires_at) < now) {
          if (refreshToken) {
            const refreshDecoded = jwtDecode<Pick<JWTToken, 'exp'>>(refreshToken);
            if (Number(refreshDecoded.exp) >= now) {
              try {
                const newToken = await UpdateToken(refreshToken);
                res(newToken);
              } catch (err) {
                console.log('erro', err.message);
                // window.location.href = "/auth/logout";
              }
            }
          } else {
            window.location.href = '/auth/logout';
          }
        }
        res(token);
      }
    });
  };

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

    const validatedToken = await ValidateToken();

    const { endpoint, body, variables } = props;
    const newUrl = AjeitaUrl(ListUrl[endpoint].url, variables);

    const { data } = await req({
      url: newUrl,
      method: ListUrl[endpoint].method,
      data: ListUrl[endpoint].method === 'GET' ? null : body,
      headers: { Authorization: 'Bearer ' + validatedToken },
    });

    return data;
  };

  return {
    req,
    apiLogin,
    apiRefreshToken,
    FetchReq,
    token,
    baseUrl: url,
  };
}
