import { parseCookies } from 'nookies';
import { create } from 'zustand';

import type { UserInfo } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';

const VALIDADE_USUARIO_MS = 30 * 60 * 1000;
let consulta: Promise<void> | null = null;
let geracao = 0;
let atualizadoEm = 0;
let ultimoCookie: string | null = null;

type EstadoUsuarioLogado = {
  usuario: UserInfo | null;
  carregado: boolean;
  carregar: () => Promise<void>;
  limpar: () => void;
};

function lerUsuario(cru: string | undefined): UserInfo | null {
  try {
    const usuario = cru ? JSON.parse(cru) : null;
    return usuario && typeof usuario === 'object' && usuario.id != null ? usuario : null;
  } catch {
    return null;
  }
}

// Só memória: remontar a caixa de mensagem não pode apagar a identidade quando
// o cookie de apresentação vence. A autorização continua sendo feita na API.
export const useUsuarioLogadoStore = create<EstadoUsuarioLogado>((set, get) => ({
  usuario: null,
  carregado: false,
  carregar: () => {
    const cru = parseCookies()['userInfo'];
    const usuarioCookie = lerUsuario(cru);
    const agora = Date.now();

    if (usuarioCookie && cru !== ultimoCookie) {
      ultimoCookie = cru;
      atualizadoEm = agora;
      set({ usuario: usuarioCookie, carregado: true });
    }

    if (get().usuario && agora - atualizadoEm < VALIDADE_USUARIO_MS) return Promise.resolve();
    if (consulta) return consulta;

    const geracaoConsulta = geracao;
    consulta = (async () => {
      try {
        // O cookie pode vencer com o chat aberto, sem navegação pelo proxy.
        // Usa a rota autenticada existente, com renovação normal da sessão.
        const usuario = await useApi().FetchReq<UserInfo>('UserInfo');
        if (geracaoConsulta !== geracao) return;
        if (!usuario?.id) throw new Error('Usuário não identificado na resposta da API');
        atualizadoEm = Date.now();
        set({ usuario, carregado: true });
      } catch {
        // Falha temporária de rede não transforma o dono em outro atendente.
        // Sem identificação prévia, os controles continuam sem acesso.
        if (geracaoConsulta === geracao) set({ carregado: true });
      } finally {
        if (geracaoConsulta === geracao) consulta = null;
      }
    })();
    return consulta;
  },
  limpar: () => {
    geracao++;
    consulta = null;
    atualizadoEm = 0;
    ultimoCookie = null;
    set({ usuario: null, carregado: false });
  },
}));
