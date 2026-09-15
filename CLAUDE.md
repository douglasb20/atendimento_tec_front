# CLAUDE.md — tecnicos_automate

Guia do frontend. O `CLAUDE.md` da raiz do workspace cobre a visão geral e os
outros subprojetos; aqui está o que é específico desta interface.

Next.js 15 (App Router) · React 19 · TypeScript · PrimeReact 10 · Zustand 5.

## Comandos

```bash
npm run dev                  # next dev --turbopack, carrega .env.homolog (que aponta para localhost)
npm run build:hom            # ou build:prod — cada um usa seu .env
npm run lint
npm run format
```

Não há `npm run build` puro nem testes. `build:dev` referencia um
`.env.development` que **não existe** — o script quebra.

## Variáveis de ambiente: build time, não runtime

`URL_ENDPOINT` e `WEBSOCKET_HOST` chegam ao cliente pelo bloco `env` do
`next.config.js`, o que significa que o Next as **embute no bundle durante a
compilação**. Consequências:

- A mesma imagem Docker **não serve dois ambientes**. Trocar de API exige
  rebuild.
- No Coolify, elas precisam estar marcadas como **Build Variable**. Como
  variável de runtime, o front sobe apontando para `undefined` — sem erro no
  log, só a tela que não responde.
- Elas não têm prefixo `NEXT_PUBLIC_`; chegam ao cliente só por causa daquele
  bloco.

⚠️ Existe um `.env` na raiz com a URL **de outro projeto**
(`atendecertoprevidencia`). O Next o lê automaticamente e ele pode mascarar
valores em execuções sem `env-cmd`.

## Rotas

Dois grupos: `(main)` para as páginas autenticadas (shell PrimeReact com sidebar
e topbar) e `(public)` para `auth` e páginas estáticas.

**Convenção:** `page.tsx` é server component, faz o fetch e passa dados por
prop; a UI vive numa pasta irmã terminada em `Section`, com `index.tsx` como
raiz. Dentro dela: `Dt<Nome>.tsx` para a data table, `Modal*.tsx`, `Filtros*.tsx`.

Duas grafias coexistem — `_ChatSection/` (com underscore, mais recente) e
`DadosCanaisSection/` (sem). **Prefira o underscore** em código novo; é a
private folder do Next e deixa explícito que não é rota.

Uma exceção conhecida: `/clientes/form/[[...id]]` tem o formulário inteiro dentro
do `page.tsx`, como client component.

`/relatorios` aparece no menu (`AppMenu.tsx`) mas a rota não existe.

## Acesso à API

Tudo passa por um registro único: o **`ListUrl`** em
`src/service/Api/ApiClient.ts` — 46 entradas mapeando um nome em português para
`{ url, method }`, com `{{placeholders}}` no path.

```ts
FetchReq<T>('ListarClientes')
FetchReq<T>('BuscarClienteId', [id])
FetchReq<T>({ endpoint: 'AtualizarCliente', variables: [id], body })
```

**Adicionar endpoint no backend significa adicionar entrada no `ListUrl`** — não
espalhe axios cru pelo código.

⚠️ O `AjeitaUrl` substitui os placeholders **por posição, não por nome**: trocar
dois de lugar no template troca os valores silenciosamente. Ele lança erro se a
quantidade divergir, mas não valida nomes. Os valores também não são
URI-encoded.

**Dois clients em paralelo**, e a distinção importa:

| | `ApiClient()` / `useApi()` | `ApiService()` (ApiServer.ts) |
|---|---|---|
| Onde | client components | server components, actions, middleware |
| Chamada | síncrona | **`await ApiService()`** |
| Cookies | `nookies` | `next/headers` |
| Refresh de token | sim, no `ValidateToken` | não |

O `ApiServer` importa o `ListUrl` do `ApiClient` mas **duplica o `AjeitaUrl`** —
mantenha os dois em sincronia. Login e refresh não estão no `ListUrl`; são
chamadas hardcoded.

⚠️ `ApiServer.ts` tem um `console.log('API Request:', ...)` em toda chamada,
**incluindo o body** — vaza payloads no log do servidor.

## Autenticação

Quatro cookies, todos setados pelo cliente e portanto **não httpOnly**: `token`,
`refresh_token`, `expires_at`, `userInfo` (este último traz `permissions[]`).

O `src/middleware.ts` protege toda rota não pública (lista em `src/constants`),
renova access tokens expirados, hidrata o `userInfo` e manda para
`/auth/logout` em caso de falha.

⚠️ **A lógica de refresh existe em três lugares** — `middleware.ts`,
`ApiClient.ValidateToken` e `AuthContext.login` — com fórmulas de `maxAge`
**divergentes** entre si. Qualquer mudança no contrato dos cookies precisa mexer
nos três.

Duas falhas conhecidas nesse caminho: em `ApiClient.ts`, quando não há `token` e
o refresh está expirado, a promise **nunca resolve** (não há `res()` nem `rej()`
naquele ramo) e a requisição pendura; e o redirect para logout está comentado,
então a falha vira um `console.log` e segue com o token velho.

## Estado do chat

Store Zustand composta por três slices (`src/store/useChatStore.ts`), tipados
sobre a interseção — qualquer slice consegue ler os outros via `get()`, embora na
prática só o `fecharConversa` atravesse.

**`chatSlice`** é o mais denso, e cada decisão dele resolve um bug concreto:

- `updateChat` sincroniza a lista **e** a `activeChat` (antes só a lista, e o
  header ficava congelado no snapshot da abertura); faz **merge parcial**,
  porque o payload do socket é a entidade crua e substituir apagaria
  `supportChatMessages`; e **descarta o `unread_count`** do payload, porque uma
  mensagem nova dispara `whatsapp:unread_count` e `whatsapp:chat_state`, e o
  segundo chega com o valor anterior ao incremento, zerando o que o primeiro
  somou.
- Conversas finalizadas **saem da lista** (espelhando o `is_final = false` do
  backend) mas continuam como `activeChat` — o atendente ainda está na tela.
- `patchActiveChat` é o caminho do **update otimista**: o header aplica o retorno
  de `IniciarAtendimentoChat` sem esperar o socket dar a volta.
- `fecharConversa` atravessa slices (zera também `messages` e `quoted`) e desfaz
  a URL com `replaceState`. Vive na store porque dois lugares precisam: o `Esc` e
  a finalização.

**Comparações de id sempre com `String()`** — eles chegam ora number, ora string,
e o helper `mesmoId` existe por isso. É a causa mais provável de "a tela não
reage".

⚠️ `addMessages` **substitui** a lista inteira, não acrescenta. Nome enganoso.

### `useOutboxStore` — store separada de propósito

A fila de envio (`src/store/useOutboxStore.ts` + `src/service/Outbox/`) não vive
no componente (trocar de chat desmontaria o `SendMessageBox` e levaria junto o
upload de um vídeo grande) nem na `useChatStore` (que é zerada a cada troca de
conversa). Persiste em `localStorage`, exceto o `previewUrl` (um `blob:` que
morre com a sessão) — e no reload todo item `enviando` vira `falhou`, porque o
`File` não é serializável.

## WebSocket

A conexão vive no `socketSlice`, criada com `transports: ['websocket']` (pula o
long-polling) e um guard que evita reconectar por cima de um socket já aberto,
deixando o anterior órfão. O ciclo de vida está em `chat/layout.tsx`.

Eventos escutados: `whatsapp:unread_count` e `whatsapp:chat_state`
(`Conversation`), `whatsapp:messages` e `whatsapp:message_ack` (`MessageItem`),
`whatsapp:channel_status` (tela de canais).

⚠️ **Há um segundo socket**, criado localmente em
`canais/DadosCanaisSection/index.tsx` — com opções diferentes (sem forçar
websocket). Convergir para a store é trabalho pendente.

⚠️ Os cleanups de listener são incompletos: `whatsapp:message_ack` e
`whatsapp:chat_state` nunca são removidos, e os `removeEventListener` de
`blur`/`focus` em `Conversation` usam arrow functions novas — não removem nada.

⚠️ O token do socket é lido uma vez no `connect()` e **não é revalidado**.

## Envio de mídia

Upload assinado direto ao storage, em três camadas:

1. **Seleção** (`SendMessageBox`): um input escondido com `accept` trocado
   dinamicamente. Selecionar **não envia** — abre o `PreviewAnexos`, onde o
   atendente confere e escreve uma legenda **por arquivo**. Enviar é irreversível
   assim que chega ao provider.
2. **Fila** (`src/service/Outbox/`): o **upload roda em paralelo**, fora da
   corrente; só o envio ao provider é serializado por conversa — senão três
   vídeos fariam o terceiro esperar os dois primeiros subirem inteiros. Usa
   **XMLHttpRequest**, não fetch, porque o fetch não expõe progresso de *upload*.
   Ao confirmar, o item **sai da fila**: a mensagem real chega pelo webhook, e
   mantê-lo exibiria duas bolhas.
3. **Renderização** (`Messages.tsx`): funde as mensagens da store com os itens da
   fila, mapeando estes para o formato de `SupportChatMessageResponse` para
   reaproveitar toda a renderização. Ordena por `datetime`, não pela confirmação
   — é o que impede um vídeo grande de pular para o fim quando o webhook chega.

O upload é **PUT**, não POST: o Backblaze não implementa o POST-policy do S3. E
as colunas do banco guardam a **key**, não a URL.

Limite de 512 MB — o teto do protocolo Baileys, não os 16 MB do WhatsApp Web.

## Regras de negócio que vivem no front

- **15 minutos** para editar mensagem, **60 horas** para apagar
  (`MenuMessageComponent`). Editar exige ainda `from_me` e
  `message_id.length === 22`.
- O backend prefixa o conteúdo com `*Nome do atendente:*\n`; o front replica isso
  na bolha otimista e o **remove ao editar**, para o atendente mexer só no que
  escreveu.
- Finalizar exige `contact.client_id`. Em vez de barrar com erro, o modal mostra
  um aviso inline com botão "Associar", que abre o modal de contato por cima.
- `Esc` fecha a conversa — exceto com diálogo aberto ou foco em campo de texto.
- O filtro de abas decide o grupo pelo **id** do status, não pela relação
  `supportChatStatus`: ela não vem nos payloads de webhook, e um grupo errado
  sumiria com a conversa da lista.

## UI

PrimeReact + PrimeFlex, com o CSS praticamente todo em classes utilitárias
inline. Tema Apollo servido de `public/theme/theme.css`; estilos próprios em
`src/styles/layout/`.

Ícones vêm de **três fontes**: PrimeIcons no menu, Font Awesome em quase todo o
chat, e `react-icons` nas dependências.

Formulários: `react-hook-form` + `yup`, com o trio `Shape<T>`, `msgRequired` e
`getFormErrorMessage` (de `service/Util`) sustentando o padrão.

Alertas: `sweetalert2` **sempre** pelos wrappers de `src/service/Util` (`Alerta`,
`CatchAlerta`, `ConfirmaAcao`, …) — nenhum componente chama o `Swal` direto.

O `LayoutContext` é `React.useContext`, apesar de o hook se chamar
`useLayoutStore`. Nada do tema é persistido — volta ao padrão a cada reload.

## Convenções

Alias único: `@/*` → `src/*`.

**Tipos em três lugares**, e a distinção importa: `src/Interfaces/` para domínio
e API (barrel em `index.ts`, sempre importado como `from '@/Interfaces'`),
`src/types/` para o template Apollo, e tipos de props no próprio arquivo do
componente.

**Português como padrão** em rotas, pastas, componentes, funções e variáveis —
`fecharConversa`, `enfileirar`, `grupoDaConversa`, `mensagensNaTela`. A exceção
são os tipos de resposta da API, que mantêm o inglês do backend
(`support_chat_status_id`, `from_me`, `unread_count`), porque espelham colunas.

Comentários explicam o **porquê** e o que quebrava antes, não o que o código faz.

`reactStrictMode: false` — os effects rodam uma única vez em dev, e boa parte do
chat depende disso implicitamente. Religá-lo provavelmente duplicaria socket e
listeners.

`noUnusedLocals: true` mesmo com `strict: false`: variável não usada quebra o
type-check.

## Pontas soltas conhecidas

- **Patch global de `console.error`** em `(main)/layout.tsx`, marcado
  "TEMPORÁRIO", para rastrear avisos de `unique key`. **Roda em produção.**
- **Troca de senha quebrada**: `ModalAlteraSenha` chama
  `req.put('/users/change-password')` — rota que não existe nem no `ListUrl` nem
  no backend. Há TODO explícito no arquivo.
- `/dashboard/page.tsx` faz `JSON.parse` do cookie `userInfo` sem guard — lança
  se o cookie faltar.
- Dois `catch (err) {}` vazios no middleware.
- Resíduos do Pages Router: `Login.getLayout`, um `<Head>` do `next/head` dentro
  do `LayoutProvider` com metatags do template original.
- `@fullcalendar/*` (4 pacotes) sem uso; `useLocalStorage`/`useSessionStorage`
  sem consumidores.
- `console.log` de debug ativos em `Messages.tsx`, `SendMessageBox.tsx`,
  `Conversation/index.tsx`, `_ChatSection/index.tsx`.
- Typo no nome do arquivo: `src/Interfaces/suport-chat.interface.ts`.
- ESLint desligado no build (`ignoreDuringBuilds`) por um bug de ESLint 9 com o
  `.eslintrc.js` legado — migrar para flat config resolveria.
