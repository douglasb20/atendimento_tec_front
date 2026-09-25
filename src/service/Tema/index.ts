import { CORES, MODOS, TEMA_PADRAO, caminhoDoTema } from '../../../scripts/temas.config.mjs';

/**
 * O tema da interface: catálogo, aplicação e persistência.
 *
 * O catálogo vem de `scripts/temas.config.mjs`, o mesmo arquivo que o gerador
 * de CSS lê. Duplicar a lista aqui seria garantir que um dia elas divergissem -
 * um card apontando para um CSS que não foi gerado.
 */

export type CorTema = {
  id: string;
  rotulo: string;
  descricao: string;
  claro: { primary: string; light: string; dark?: string; darker?: string };
  escuro: { primary: string; light: string };
};

export type ModoTema = {
  id: string;
  rotulo: string;
  descricao: string;
};

export const CORES_TEMA = CORES as CorTema[];
export const MODOS_TEMA = Object.values(MODOS) as ModoTema[];
export const PADRAO = TEMA_PADRAO as { cor: string; modo: string };

/** Cookie lido pelo `RootLayout` para pintar certo já no servidor. */
export const COOKIE_TEMA = 'tema';

/**
 * Normaliza o que veio do banco ou do cookie.
 *
 * Tolerante de propósito: um valor desconhecido - de um tema removido do
 * catálogo, ou de um cookie adulterado - cai no padrão em vez de deixar a
 * página sem folha de estilo.
 */
export const normalizaTema = (cor?: string | null, modo?: string | null) => ({
  cor: CORES_TEMA.some((c) => c.id === cor) ? cor! : PADRAO.cor,
  modo: MODOS_TEMA.some((m) => m.id === modo) ? modo! : PADRAO.modo,
});

/** `automatec/claro` - o formato compacto que vai no cookie. */
export const serializaTema = (cor: string, modo: string) => `${cor}/${modo}`;

/**
 * O tema a aplicar no SSR, conciliando as duas fontes que o servidor enxerga.
 *
 * O cookie próprio é o caminho rápido - escrito a cada troca, dura um ano. O
 * `userInfo` é a rede: traz o tema do banco e o middleware o recria sempre que
 * falta, então cobre o navegador que perdeu o cookie de tema e a aba aberta
 * antes de a preferência existir.
 *
 * O cookie vence quando existe: ele é o mais recente. O `userInfo` só vale
 * quando o outro está ausente ou inválido.
 */
export const temaDoServidor = (cookieTema?: string | null, userInfo?: string | null) => {
  const doCookie = desserializaTema(cookieTema);
  const cookieValido = cookieTema && serializaTema(doCookie.cor, doCookie.modo) === cookieTema;

  if (cookieValido) return doCookie;

  try {
    const info = JSON.parse(decodeURIComponent(userInfo ?? ''));
    return normalizaTema(info?.tema, info?.modo_tema);
  } catch {
    return doCookie;
  }
};

export const desserializaTema = (valor?: string | null) => {
  const [cor, modo] = (valor ?? '').split('/');
  return normalizaTema(cor, modo);
};

export const urlDoTema = (cor: string, modo: string) => caminhoDoTema(cor, modo) as string;

/**
 * Troca a folha de estilo do tema sem piscar.
 *
 * ⚠️ **Não altera o `href` no lugar.** Fazer isso deixa a página sem estilo
 * nenhum enquanto o CSS novo baixa - some tudo e volta, o que num arquivo de
 * 200 KB é bem visível. Em vez disso, clona o `<link>`, aponta o clone para o
 * CSS novo, insere ao lado e **só remove o antigo quando o novo terminou de
 * carregar**: nunca existe um instante sem folha de estilo.
 *
 * O truque vem dos temas oficiais do PrimeReact; o que acrescento é resolver a
 * promessa no `load` de verdade (nas duas implementações que vi de referência
 * ela resolvia na hora, e quem usava `await` não esperava nada) e tratar o
 * `error`, para um CSS que falhe não deixar a interface em promessa pendente.
 */
/**
 * Põe no `<html>` a classe do modo em vigor.
 *
 * ⚠️ **O CSS sozinho não basta.** A classe `layout-${modo}` é o que define
 * `--menu-bg` e as superfícies do shell (sidebar, topbar), e ela é escrita no
 * servidor, em `app/layout.tsx`. Sem atualizá-la aqui, trocar para um tema
 * escuro deixava o CSS escuro e a **barra lateral branca** - some ao recarregar,
 * porque aí o servidor reescreve a classe certa.
 *
 * `layout-colorscheme-menu` não é tocada: ela não depende do modo.
 */
const aplicaClasseDoModo = (modo: string) => {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;

  // Remove o modo anterior antes de pôr o novo: as três classes juntas fariam
  // a última do CSS vencer, que não é necessariamente a escolhida.
  //
  // `MODOS_TEMA` traz objetos (`{ id, rotulo, descricao }`), não strings - daí
  // o `.id`. Sem ele a classe sairia como `layout-[object Object]`.
  MODOS_TEMA.forEach((m) => html.classList.remove(`layout-${m.id}`));
  html.classList.add(`layout-${modo}`);
};

export const aplicaTema = (cor: string, modo: string): Promise<void> =>
  new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve();

    const link = document.getElementById('theme-link') as HTMLLinkElement | null;
    const novoHref = urlDoTema(cor, modo);

    // Antes de tudo, e fora do `if` abaixo: trocar só o modo dentro da mesma
    // cor mantém o mesmo href em alguns casos, e a classe precisa mudar
    // mesmo assim.
    aplicaClasseDoModo(modo);

    if (!link || link.getAttribute('href') === novoHref) return resolve();

    const clone = link.cloneNode(true) as HTMLLinkElement;
    clone.setAttribute('href', novoHref);
    clone.setAttribute('id', 'theme-link-clone');

    const finaliza = (trocou: boolean) => {
      if (trocou) {
        link.remove();
        clone.setAttribute('id', 'theme-link');
      } else {
        // O CSS novo não carregou: descarta o clone e segue com o tema atual.
        // Melhor a cor antiga do que uma tela sem estilo.
        clone.remove();
      }
      resolve();
    };

    clone.addEventListener('load', () => finaliza(true), { once: true });
    clone.addEventListener('error', () => finaliza(false), { once: true });

    link.parentNode?.insertBefore(clone, link.nextSibling);
  });

/**
 * Grava o cookie que o servidor lê no próximo carregamento.
 *
 * Não é a fonte de verdade - essa é o banco, pelo `users.tema`. O cookie existe
 * só para o `RootLayout` montar o `<link>` certo no primeiro byte e não haver
 * flash de tema errado. Um ano de validade porque é preferência, não sessão.
 *
 * `SameSite=Lax` e sem `Secure` em desenvolvimento: com `Secure` o cookie não
 * é gravado em `http://localhost`, e o flash voltaria só no ambiente local.
 */
export const gravaCookieTema = (cor: string, modo: string) => {
  if (typeof document === 'undefined') return;

  const seguro = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_TEMA}=${serializaTema(cor, modo)}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; SameSite=Lax${seguro}`;
};

/**
 * Reflete o tema escolhido no cookie `userInfo`.
 *
 * Aquele cookie é o espelho do banco que o resto da interface lê, e vence só a
 * cada 30 minutos. Sem atualizá-lo ao salvar, ele continuaria anunciando o
 * tema antigo até expirar - e a sincronização inicial, que confia nele,
 * desfaria a escolha.
 *
 * ⚠️ Preserva o `maxAge` original? Não: o navegador não o expõe. Regravar sem
 * `max-age` o torna cookie de sessão, o que aqui é aceitável - ele é recriado
 * pelo middleware na navegação seguinte. Perder a validade curta dele seria
 * ruim (é o que faz troca de permissão chegar rápido), então mantemos um teto
 * de 30 minutos, igual ao da origem.
 */
export const atualizaTemaNoUserInfo = (cor: string, modo: string) => {
  if (typeof document === 'undefined') return;

  try {
    const cru = document.cookie
      .split('; ')
      .find((c) => c.startsWith('userInfo='))
      ?.slice('userInfo='.length);

    if (!cru) return;

    const info = JSON.parse(decodeURIComponent(cru));
    const atualizado = encodeURIComponent(JSON.stringify({ ...info, tema: cor, modo_tema: modo }));

    const seguro = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `userInfo=${atualizado}; path=/; max-age=${30 * 60}; SameSite=Lax${seguro}`;
  } catch {
    // Cookie ausente ou ilegível: o de tema já guarda a escolha, e o
    // `userInfo` será recriado pelo middleware com o valor do banco.
  }
};
