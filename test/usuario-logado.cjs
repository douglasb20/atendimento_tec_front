// Executar em front/: node test/usuario-logado.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function carregar(caminho, dependencias = {}) {
  const modulo = { exports: {} };
  const compilado = ts.transpileModule(fs.readFileSync(caminho, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }, fileName: caminho,
  });
  new Function('require', 'exports', compilado.outputText)(nome => dependencias[nome] ?? require(nome), modulo.exports);
  return modulo.exports;
}

function adiar() {
  let resolver;
  const promise = new Promise(resolve => { resolver = resolve; });
  return { promise, resolver };
}

(async () => {
  const dataOriginal = Date.now;
  let agora = 1_800_000_000_000;
  Date.now = () => agora;
  try {
    let cookies = {};
    let chamadas = 0;
    let resposta = async () => ({ id: 7, name: 'Douglas', permissions: ['support.chat:update'] });
    const { useUsuarioLogadoStore: store } = carregar('src/store/useUsuarioLogadoStore.ts', {
      nookies: { parseCookies: () => cookies },
      '@/service/Api/ApiClient': { default: () => ({ FetchReq: async endpoint => {
        assert.equal(endpoint, 'UserInfo');
        chamadas++;
        return resposta();
      } }) },
    });
    const estado = () => store.getState();
    const interfaces = carregar('src/Interfaces/suport-chat.interface.ts');
    const chat = { user_id: 7, support_chat_status_id: 2, paused_at: null };

    // Reprodução: após 30 minutos o cookie some e a caixa é remontada ao trocar de chat.
    cookies.userInfo = JSON.stringify(await resposta());
    await estado().carregar();
    assert.equal(estado().usuario.id, 7);
    assert.equal(chamadas, 0);
    cookies = {};
    agora += 31 * 60_000;
    await estado().carregar();
    assert.equal(chamadas, 1);
    assert.equal(interfaces.podeAgirNoAtendimento(chat, estado().usuario.id), true);
    assert.equal(interfaces.podeAgirNoAtendimento({ ...chat, user_id: 8 }, estado().usuario.id), false);
    assert.equal(interfaces.podeAgirNoAtendimento({ ...chat, paused_at: '2026-11-12' }, estado().usuario.id), false);
    await estado().carregar();
    assert.equal(chamadas, 1, 'Remontagens reaproveitam a identidade compartilhada');

    // Cookie ausente/corrompido em uma carga inicial também recupera pela API.
    estado().limpar();
    cookies.userInfo = '{inválido';
    const pendente = adiar();
    resposta = () => pendente.promise;
    const primeira = estado().carregar();
    const segunda = estado().carregar();
    assert.equal(primeira, segunda);
    assert.equal(chamadas, 2, 'Componentes simultâneos fazem uma consulta');
    pendente.resolver({ id: 7, permissions: ['support.chat:update'] });
    await primeira;
    assert.equal(estado().usuario.id, 7);

    // Erro de rede não apaga o dono; a próxima tentativa recupera as permissões atuais.
    agora += 31 * 60_000;
    resposta = async () => { throw new Error('Rede indisponível'); };
    await estado().carregar();
    assert.equal(estado().usuario.id, 7);
    resposta = async () => ({ id: 7, permissions: [] });
    await estado().carregar();
    assert.deepEqual(estado().usuario.permissions, []);

    // Os hooks reais usam o mesmo estado após remontagem, sem reler o cookie expirado.
    const efeitos = [];
    const react = { useEffect: f => efeitos.push(f), useMemo: f => f() };
    const selecionar = seletor => seletor(estado());
    const usuarioHook = carregar('src/hooks/useUsuarioLogado.ts', {
      react, '@/store/useUsuarioLogadoStore': { useUsuarioLogadoStore: selecionar },
    });
    const permissoesHook = carregar('src/hooks/usePermissoes.ts', {
      react, './useUsuarioLogado': usuarioHook,
    });
    assert.equal(usuarioHook.useUsuarioLogado().usuarioId, 7);
    assert.equal(permissoesHook.usePermissoes().usuarioId, 7);
    assert.equal(permissoesHook.usePermissoes().pode('support.chat:update'), false);

    // Logout invalida requisições antigas, inclusive quando outra conta entra em seguida.
    estado().limpar();
    const anterior = adiar();
    resposta = () => anterior.promise;
    const consultaAntiga = estado().carregar();
    estado().limpar();
    resposta = async () => ({ id: 8, permissions: [] });
    await estado().carregar();
    anterior.resolver({ id: 7, permissions: ['support.chat:update'] });
    await consultaAntiga;
    assert.equal(estado().usuario.id, 8);

    estado().limpar();
    resposta = async () => { throw new Error('Sem sessão'); };
    await estado().carregar();
    assert.equal(estado().usuario, null);
    assert.equal(estado().carregado, true);

    // A recuperação do usuário e o timer compartilham a renovação de sessão.
    const renovacao = adiar();
    let renovacoes = 0;
    const cliente = async () => ({ data: { id: 7 } });
    const axios = { create: () => cliente, post: () => { renovacoes++; return renovacao.promise; } };
    const sessao = carregar('src/service/Api/sessaoViva.ts', {
      axios: { default: axios }, nookies: { parseCookies: () => ({}) },
    });
    const api = carregar('src/service/Api/ApiClient.ts', {
      axios: { default: axios }, nookies: { parseCookies: () => ({}) }, './sessaoViva': sessao,
    }).default();
    const timer = sessao.renovaSessao();
    const requisicao = api.FetchReq('UserInfo');
    assert.equal(renovacoes, 1);
    renovacao.resolver({ data: {} });
    await Promise.all([timer, requisicao]);

    console.log('Identidade validada: cookie vencido, remontagem, permissões, falha de rede, consultas concorrentes, logout e renovação única. Sem rede real.');
  } finally {
    Date.now = dataOriginal;
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
