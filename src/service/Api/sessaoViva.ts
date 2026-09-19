import axios from 'axios';
import { parseCookies } from 'nookies';

/**
 * Mantém o cookie de sessão renovado enquanto a aba estiver aberta.
 *
 * Antes, a renovação só acontecia dentro do `FetchReq`: quem ficasse parado no
 * chat — que é o uso normal de um portal de atendimento, esperando mensagem —
 * não disparava requisição nenhuma, o access de 30min vencia, e na primeira
 * reconexão do socket o gateway recusava com `jwt expired`.
 *
 * A renovação aqui é *proativa*: acontece com folga antes do vencimento, não
 * depois. Assim o cookie que o navegador manda no handshake do socket está
 * sempre vivo.
 */

/** Renova com esta antecedência. Metade do access de 30min, com folga de sobra. */
const ANTECEDENCIA_SEG = 5 * 60;

/** Teto entre verificações: o `setTimeout` de aba em segundo plano é impreciso. */
const INTERVALO_MAX_MS = 5 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let renovando: Promise<void> | null = null;

const urlApi = process.env.URL_ENDPOINT;

/**
 * Renova a sessão, no máximo uma vez por vez.
 *
 * A deduplicação importa: o timer e o `visibilitychange` podem coincidir, e
 * duas chamadas simultâneas a `/auth/refresh` fariam a segunda usar um refresh
 * já rotacionado — que o backend recusa, derrubando a sessão justamente por
 * tentar preservá-la.
 */
export const renovaSessao = (): Promise<void> => {
  if (renovando) return renovando;

  renovando = axios
    .post(`${urlApi}/auth/refresh`, {}, { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      renovando = null;
    });

  return renovando;
};

/** Segundos restantes do access, ou 0 quando o cookie está ausente/ilegível. */
const segundosRestantes = (): number => {
  const expiresAt = Number(parseCookies(null)['expires_at']);
  if (!Number.isFinite(expiresAt)) return 0;

  return expiresAt - Math.floor(Date.now() / 1000);
};

const agenda = (ms: number) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(verifica, Math.max(1000, ms));
};

const verifica = async () => {
  const restante = segundosRestantes();

  if (restante <= ANTECEDENCIA_SEG) {
    try {
      await renovaSessao();
    } catch {
      // Sem sessão recuperável não há o que reagendar: o middleware manda para
      // o login na próxima navegação, e insistir aqui só geraria 401 em série.
      pararRenovacaoDeSessao();
      return;
    }
  }

  const proximo = Math.min((segundosRestantes() - ANTECEDENCIA_SEG) * 1000, INTERVALO_MAX_MS);
  agenda(proximo);
};

/**
 * Renova ao voltar para a aba.
 *
 * O `setTimeout` é adiado ou congelado em aba oculta, então uma máquina que
 * dormiu acorda com o cookie vencido e o timer sem ter disparado.
 */
const aoVoltarParaAba = () => {
  if (document.visibilityState === 'visible') verifica();
};

export const iniciarRenovacaoDeSessao = () => {
  if (typeof window === 'undefined') return;

  document.addEventListener('visibilitychange', aoVoltarParaAba);
  verifica();
};

export const pararRenovacaoDeSessao = () => {
  if (timer) clearTimeout(timer);
  timer = null;
  document.removeEventListener('visibilitychange', aoVoltarParaAba);
};
