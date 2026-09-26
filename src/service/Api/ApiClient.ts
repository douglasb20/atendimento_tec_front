import axios from 'axios';
import { parseCookies } from 'nookies';
import { ILoginResp } from '@/Interfaces';

const url = process.env.URL_ENDPOINT;

export const ListUrl = {
  ListarClientes: { url: '/clients', method: 'GET' },
  CriarCliente: { url: '/clients', method: 'POST' },
  AtualizarCliente: { url: '/clients/{{client_id}}', method: 'PATCH' },
  RemoverCliente: { url: '/clients/{{client_id}}', method: 'DELETE' },
  BuscarClienteId: { url: '/clients/{{client_id}}', method: 'GET' },
  ListarTags: { url: '/tags', method: 'GET' },
  ListarCamposPersonalizados: { url: '/custom-fields', method: 'GET' },
  ListarCamposPorAplicacao: { url: '/custom-fields?aplica_a={{aplica_a}}', method: 'GET' },
  BuscarCampoPersonalizado: { url: '/custom-fields/{{campo_id}}', method: 'GET' },
  AdicionarCampoPersonalizado: { url: '/custom-fields', method: 'POST' },
  AtualizarCampoPersonalizado: { url: '/custom-fields/{{campo_id}}', method: 'PATCH' },
  RemoverCampoPersonalizado: { url: '/custom-fields/{{campo_id}}', method: 'DELETE' },
  BuscarTag: { url: '/tags/{{tag_id}}', method: 'GET' },
  AdicionarTag: { url: '/tags', method: 'POST' },
  AtualizarTag: { url: '/tags/{{tag_id}}', method: 'PATCH' },
  RemoverTag: { url: '/tags/{{tag_id}}', method: 'DELETE' },

  // Setores de atendimento. `ListarSetores` também serve ao cadastro de
  // usuário, que escolhe os setores de cada pessoa.
  ListarSetores: { url: '/departments', method: 'GET' },
  AdicionarSetor: { url: '/departments', method: 'POST' },
  AtualizarSetor: { url: '/departments/{{department_id}}', method: 'PATCH' },
  RemoverSetor: { url: '/departments/{{department_id}}', method: 'DELETE' },
  ListarMembrosSetor: { url: '/departments/{{department_id}}/users', method: 'GET' },
  AtualizarMembrosSetor: { url: '/departments/{{department_id}}/users', method: 'PATCH' },
  BuscarHorarioSetor: { url: '/departments/{{department_id}}/schedule', method: 'GET' },
  AtualizarHorarioSetor: { url: '/departments/{{department_id}}/schedule', method: 'PATCH' },

  // Chatbot por fluxo visual. `type=complementar` na query lista os fluxos
  // complementares (subfluxos), separado da listagem principal.
  ListarChatbots: { url: '/chatbots', method: 'GET' },
  ListarFluxosComplementares: { url: '/chatbots?type=complementar', method: 'GET' },
  BuscarChatbot: { url: '/chatbots/{{chatbot_id}}', method: 'GET' },
  AdicionarChatbot: { url: '/chatbots', method: 'POST' },
  AtualizarChatbot: { url: '/chatbots/{{chatbot_id}}', method: 'PATCH' },
  RemoverChatbot: { url: '/chatbots/{{chatbot_id}}', method: 'DELETE' },
  BuscarFluxoChatbot: { url: '/chatbots/{{chatbot_id}}/flow', method: 'GET' },
  SalvarFluxoChatbot: { url: '/chatbots/{{chatbot_id}}/flow', method: 'PUT' },
  AssinarMediaChatbot: { url: '/chatbots/sign-media', method: 'POST' },

  ListarIntegracoes: { url: '/integrations', method: 'GET' },
  BuscarIntegracao: { url: '/integrations/{{integration_id}}', method: 'GET' },
  AdicionarIntegracao: { url: '/integrations', method: 'POST' },
  AtualizarIntegracao: { url: '/integrations/{{integration_id}}', method: 'PATCH' },
  RemoverIntegracao: { url: '/integrations/{{integration_id}}', method: 'DELETE' },
  ListarProvidersIntegracao: { url: '/integrations/providers', method: 'GET' },
  TestarConexaoIntegracao: { url: '/integrations/testar-conexao', method: 'POST' },
  RevelarCredenciaisIntegracao: {
    url: '/integrations/{{integration_id}}/credenciais',
    method: 'GET',
  },
  AtualizarTagsCliente: { url: '/clients/{{client_id}}/tags', method: 'PATCH' },

  BuscarContatoClientId: { url: '/clients/{{client_id}}/contact', method: 'GET' },

  ListarContatos: { url: '/contacts', method: 'GET' },
  AdicionarContato: { url: '/contacts', method: 'POST' },
  AtualizarContato: { url: '/contacts/contact/{{contact_id}}', method: 'PATCH' },
  RemoverContato: { url: '/contacts/contact/{{contact_id}}', method: 'DELETE' },
  AssinarAvatarContato: { url: '/contacts/contact/{{contact_id}}/sign-avatar', method: 'POST' },
  BuscarFotoWhatsappContato: {
    url: '/contacts/contact/{{contact_id}}/buscar-foto-whatsapp',
    method: 'POST',
  },

  ListarGruposPermissao: { url: '/permission-groups', method: 'GET' },
  BuscarGrupoPermissao: { url: '/permission-groups/{{group_id}}', method: 'GET' },
  AdicionarGrupoPermissao: { url: '/permission-groups', method: 'POST' },
  AtualizarGrupoPermissao: { url: '/permission-groups/{{group_id}}', method: 'PATCH' },
  RemoverGrupoPermissao: { url: '/permission-groups/{{group_id}}', method: 'DELETE' },

  ListarPermissoes: { url: '/permissions', method: 'GET' },
  ListarModulosPermissao: { url: '/permissions/modules', method: 'GET' },

  ListarUsuarios: { url: '/users', method: 'GET' },
  BuscarUsuarioPorId: { url: '/users/{{user_id}}', method: 'GET' },
  // O próprio cadastro, sob `user:profile_view`/`user:profile_update`. As
  // rotas `/users/:id` exigem `user:view`/`user:update`, que são "qualquer
  // usuário" - separadas porque um atendente precisa do seu sem ver o dos
  // colegas.
  MeuPerfil: { url: '/users/meu-perfil', method: 'GET' },
  AtualizarMeuPerfil: { url: '/users/meu-perfil', method: 'PATCH' },
  AdicionarUsuario: { url: '/users', method: 'POST' },
  AtualizarUsuario: { url: '/users/{{user_id}}', method: 'PATCH' },
  RemoverUsuario: { url: '/users/{{user_id}}', method: 'DELETE' },
  AssinarAvatarUsuario: { url: '/users/sign-avatar', method: 'POST' },
  AtualizarPreferenciasTema: { url: '/users/preferencias-tema', method: 'PATCH' },

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
  SincronizarStatusCanal: {
    url: '/channels/{{channel_id}}/sincronizar-status',
    method: 'GET',
  },
  AdicionarCanal: { url: '/channels', method: 'POST' },
  AtualizarCanal: { url: '/channels/{{channel_id}}', method: 'PATCH' },
  RemoverCanal: { url: '/channels/{{channel_id}}', method: 'DELETE' },
  IniciarSessao: { url: '/channels/{{channel_id}}/start', method: 'GET' },
  ReiniciarCanal: { url: '/channels/{{channel_id}}/reiniciar', method: 'POST' },
  FinalizarSessao: { url: '/channels/{{channel_id}}/terminate', method: 'GET' },

  ListarServicos: { url: '/services', method: 'GET' },
  UserInfo: { url: '/users/info', method: 'GET' },

  ListarAtendimentosSuporte: { url: '/support-chats', method: 'GET' },
  ContarAtendimentosAnteriores: {
    url: '/support-chats/{{chat_id}}/anteriores',
    method: 'GET',
  },
  BuscarAtendimentoAnterior: {
    // `antes_de` como placeholder: o `AjeitaUrl` só substitui `{{...}}`, e não
    // monta query string - pôr o parâmetro no template é o caminho suportado.
    url: '/support-chats/{{chat_id}}/anterior?antes_de={{antes_de}}',
    method: 'GET',
  },
  ListarMensagensPorAtendimentoId: {
    url: '/support-chats/{{support_chat_id}}/messages',
    method: 'GET',
  },

  SendMessage: { url: '/support-chats/{{support_chat_id}}/send-message', method: 'POST' },
  SendReaction: { url: '/support-chats/{{support_chat_id}}/send-reaction', method: 'POST' },
  IniciarAtendimentoChat: { url: '/support-chats/{{support_chat_id}}/iniciar', method: 'POST' },
  CriarAtendimentoNovo: { url: '/support-chats/nova', method: 'POST' },
  MarcarConversaLida: {
    url: '/support-chats/{{support_chat_id}}/marcar-lida',
    method: 'POST',
  },
  FinalizarAtendimentoChat: {
    url: '/support-chats/{{support_chat_id}}/finalizar',
    method: 'POST',
  },
  // Encerra sem que tenha havido atendimento: spam, engano, contato que não
  // será atendido. Regras opostas às do `finalizar` - por isso rota própria.
  FinalizarSemAtendimento: {
    url: '/support-chats/{{support_chat_id}}/finalizar-sem-atendimento',
    method: 'POST',
  },
  MarcarConversaNaoLida: {
    url: '/support-chats/{{support_chat_id}}/marcar-nao-lida',
    method: 'POST',
  },
  TransferirAtendimentoChat: {
    url: '/support-chats/{{support_chat_id}}/transferir',
    method: 'POST',
  },
  SendReply: { url: '/support-chats/{{support_chat_id}}/send-reply', method: 'POST' },
  AssinarMediaUpload: { url: '/support-chats/sign-media-post', method: 'POST' },
  SendMedia: { url: '/support-chats/{{support_chat_id}}/send-media', method: 'POST' },
  OcultarMensagens: {
    url: '/support-chats/{{support_chat_id}}/ocultar-mensagens',
    method: 'POST',
  },
  DeleteMessage: { url: '/support-chats/{{support_chat_id}}/delete-message', method: 'POST' },
  EditarMensagem: { url: '/support-chats/{{support_chat_id}}/edit-message', method: 'POST' },

  ListarRespostasRapidas: { url: '/quick-replies', method: 'GET' },
  AdicionarRespostaRapida: { url: '/quick-replies', method: 'POST' },
  AtualizarRespostaRapida: { url: '/quick-replies/{{quick_reply_id}}', method: 'PATCH' },
  RemoverRespostaRapida: { url: '/quick-replies/{{quick_reply_id}}', method: 'DELETE' },
  AssinarAnexoRespostaRapida: { url: '/quick-replies/assinar-anexo', method: 'POST' },

  // Avisos temporários enviados na abertura do atendimento.
  ListarAvisos: { url: '/service-alerts', method: 'GET' },
  AdicionarAviso: { url: '/service-alerts', method: 'POST' },
  AtualizarAviso: { url: '/service-alerts/{{alert_id}}', method: 'PATCH' },
  // Separado do update: desligar o aviso quando o problema passa é a ação do
  // dia a dia, e deve custar um clique na listagem.
  AlternarAvisoAtivo: { url: '/service-alerts/{{alert_id}}/ativo', method: 'PATCH' },
  RemoverAviso: { url: '/service-alerts/{{alert_id}}', method: 'DELETE' },
  PrepararAnexoRespostaRapida: {
    url: '/quick-replies/{{quick_reply_id}}/preparar-anexo',
    method: 'POST',
  },

  ListarAjustesSistema: { url: '/system-settings', method: 'GET' },
  AtualizarAjustesSistema: { url: '/system-settings', method: 'PATCH' },
  TestarEmailSistema: { url: '/system-settings/testar-email', method: 'POST' },

  // Preferências do próprio usuário (tema e notificações). O alvo vem sempre
  // do token - não há id na URL.
  ListarPreferencias: { url: '/user-config', method: 'GET' },
  AtualizarPreferencias: { url: '/user-config', method: 'PATCH' },

  // Chat interno. `ListarColegas` existe em vez de reusar `ListarUsuarios`
  // porque aquela rota exige `user:view`, que é administrativa - o atendente
  // comum não a tem e ficaria sem lista de colegas.
  ListarColegas: { url: '/internal-chats/colegas', method: 'GET' },
  ListarConversasInternas: { url: '/internal-chats', method: 'GET' },
  ContarNaoLidasInternas: { url: '/internal-chats/nao-lidas', method: 'GET' },
  // O `limite` vai no template, não concatenado no id: o `AjeitaUrl` troca os
  // placeholders por posição e não monta query - juntar os dois produzia
  // `/internal-chats/2?limite=50/messages`.
  ListarMensagensInternas: {
    url: '/internal-chats/{{chat_id}}/messages?limite={{limite}}',
    method: 'GET',
  },
  // O parâmetro é o id do **destinatário**, não o da conversa: ela nasce no
  // primeiro envio, do lado do backend.
  EnviarMensagemInterna: { url: '/internal-chats/{{user_id}}/messages', method: 'POST' },
  AssinarMidiaInterna: { url: '/internal-chats/sign-media', method: 'POST' },
  MarcarConversaInternaLida: { url: '/internal-chats/{{chat_id}}/read', method: 'PATCH' },

  EsqueciSenha: { url: '/auth/esqueci-senha', method: 'POST' },
  ValidarTokenSenha: { url: '/auth/redefinir-senha/{{token}}/valido', method: 'GET' },
  RedefinirSenha: { url: '/auth/redefinir-senha', method: 'POST' },
};

/**
 * Endpoints que funcionam sem sessão.
 *
 * O `FetchReq` renova o token antes de cada chamada, e numa tela pública não há
 * o que renovar: o refresh devolve 401 e o cliente manda para o logout - a tela
 * de "esqueci minha senha" ia parar no login sem mostrar erro nenhum, porque o
 * redirecionamento acontecia antes de a requisição sair.
 */
const ENDPOINTS_PUBLICOS = new Set<keyof typeof ListUrl>([
  'EsqueciSenha',
  'ValidarTokenSenha',
  'RedefinirSenha',
]);

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
    // Os tokens são cookies httpOnly: o JavaScript não os lê, e é o navegador
    // que os anexa. Sem isto ele não os envia em requisição cross-origin - e em
    // produção front e API estão em subdomínios distintos.
    withCredentials: true,
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

  /** Encerra a sessão: só o servidor apaga um cookie httpOnly. */
  const apiLogout = async (): Promise<void> => {
    await req.post('/auth/logout', {});
  };

  /**
   * Renova a sessão. O refresh vai no cookie httpOnly - não há o que enviar no
   * corpo, e a resposta traz só o novo `expires_at`; os cookies vêm no
   * `Set-Cookie` da própria resposta.
   */
  const apiRefreshToken = async (): Promise<{ expires_at: number }> => {
    const { data } = await req.post<{ expires_at: number }>('/auth/refresh', {});
    return data;
  };

  /** Manda para o logout e devolve uma promise que nunca resolve: a navegação
   *  já está a caminho, e resolver faria a requisição seguir sem sessão. */
  const encerraSessao = (): Promise<void> => {
    window.location.href = '/auth/logout';
    return new Promise<void>(() => {});
  };

  /**
   * Garante uma sessão válida antes da requisição, renovando se o access venceu.
   *
   * Desde que os tokens viraram cookies httpOnly, esta função não devolve nem
   * lê token nenhum: ela só decide *se* precisa renovar, olhando o `expires_at`
   * - o único cookie legível, e que carrega apenas um timestamp. Quem envia as
   * credenciais é o navegador.
   */
  const ValidateToken = async (): Promise<void> => {
    const expiresAt = Number(parseCookies(null)['expires_at']);
    const now = Math.floor(Date.now() / 1000);

    // Ausente ou ilegível conta como expirado: antes virava `NaN`, e como
    // `NaN < now` é `false` a renovação era pulada - o pedido seguia com um
    // access morto enquanto o refresh, válido, ficava sem uso.
    const precisaRenovar = !Number.isFinite(expiresAt) || expiresAt < now;
    if (!precisaRenovar) return;

    try {
      await apiRefreshToken();
    } catch (err) {
      // Refresh recusado ou expirado: não há como recuperar a sessão daqui.
      console.error('Falha ao renovar a sessão:', err);
      return encerraSessao();
    }
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

    const { endpoint, body, variables } = props;

    // Renova antes de enviar, se o access já venceu. Não devolve mais o token:
    // com httpOnly não há o que ler nem o que pôr no header - o cookie
    // renovado vai sozinho na requisição abaixo.
    //
    // Endpoints públicos ficam de fora: sem sessão, a renovação falha e o
    // cliente redireciona para o logout antes mesmo de chamar a API.
    if (!ENDPOINTS_PUBLICOS.has(endpoint)) {
      await ValidateToken();
    }
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
    apiLogout,
    apiRefreshToken,
    FetchReq,
    token,
    baseUrl: url,
  };
}
