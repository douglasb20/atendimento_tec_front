// Executar em front/: node test/anexo-aviso.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');
const { tipoDoArquivo } = carregar('src/Interfaces/quick-reply.interface.ts');
const caminho = 'src/app/(main)/atendimentos/avisos/_DadosAvisosSection/';
function procurar(no, tipo) {
  if (Array.isArray(no)) return no.map(n => procurar(n, tipo)).find(Boolean);
  if (!no?.props) return null;
  return no.type === tipo ? no : procurar(no.props.children, tipo);
}
function hooks() {
  const estados = [], efeitos = [];
  let indice = 0;
  return { estados, efeitos, reiniciar: () => { indice = 0; }, react: {
    useState: inicial => { const i = indice++; if (!(i in estados)) estados[i] = inicial;
      return [estados[i], valor => { estados[i] = typeof valor === 'function' ? valor(estados[i]) : valor; }]; },
    useEffect: acao => efeitos.push(acao), useMemo: acao => acao(),
  } };
}
(async () => {
  const h = hooks(), chamadas = [], erros = [], uploads = [];
  const permissoes = { podeAdicionar: true, podeEditar: true };
  const util = { CatchAlerta: erro => erros.push(erro), sleep: async () => {}, AlertaCallback() {}, getFormErrorMessage() {} };
  const useApi = () => ({ FetchReq: async entrada => {
    chamadas.push(entrada);
    if (entrada.endpoint === 'AssinarAnexoAviso') return { key: 'service-alerts/1234.pdf', url: 'https://storage/upload', headers: { 'Content-Type': 'application/pdf' } };
    return typeof entrada === 'string' ? [] : {};
  } });
  const Section = carregar(caminho + 'index.tsx', {
    react: h.react, '@/Interfaces': { tipoDoArquivo }, '@/service/Api/ApiClient': { default: useApi },
    '@/service/Util': util, '@/contexts/ServicesContext': { useService: () => ({ setLoading() {} }) },
    '@/hooks/usePermissoesModulo': { usePermissoesModulo: () => permissoes },
    '@/components/TitleCards': { default: 'TitleCards' }, './DtAvisos': { default: 'DtAvisos' },
    './ModalFormAviso': { default: 'ModalFormAviso' },
  }).default;
  const renderizar = () => { h.reiniciar(); return Section({ data: [] }); };
  renderizar(); h.efeitos[0]();
  const formulario = { titulo: ' Aviso ', mensagem: 'Texto', ativo: true, channel_ids: [] };
  const arquivo = new File(['anexo'], 'manual.pdf', { type: 'application/pdf' });
  const fetchOriginal = global.fetch;
  try {
    global.fetch = async (url, opcoes) => { uploads.push({ url, opcoes }); return { ok: true }; };
    await procurar(renderizar(), 'ModalFormAviso').props.onConfirm(formulario, arquivo, false);
    assert.equal(chamadas[0].endpoint, 'AssinarAnexoAviso');
    assert.equal(uploads[0].opcoes.method, 'PUT');
    assert.equal(uploads[0].opcoes.body, arquivo);
    const criar = chamadas.find(c => c.endpoint === 'AdicionarAviso');
    assert.equal(criar.body.anexo_key, 'service-alerts/1234.pdf');
    assert.equal(criar.body.anexo_tipo, 'document');
    assert.equal(criar.body.anexo_nome, 'manual.pdf');
    assert.equal(criar.body.titulo, 'Aviso');

    const existente = { id: 4, ...formulario, anexo_key: 'service-alerts/antigo.pdf' };
    procurar(renderizar(), 'DtAvisos').props.actions[0].command(existente);
    chamadas.length = 0;
    await procurar(renderizar(), 'ModalFormAviso').props.onConfirm(formulario, null, false);
    assert.equal(chamadas[0].endpoint, 'AtualizarAviso');
    assert.equal('anexo_key' in chamadas[0].body, false, 'Sem alteração, preserva arquivo no servidor');

    procurar(renderizar(), 'DtAvisos').props.actions[0].command(existente);
    chamadas.length = 0;
    await procurar(renderizar(), 'ModalFormAviso').props.onConfirm(formulario, null, true);
    assert.equal(chamadas[0].body.anexo_key, null);
    assert.equal(chamadas[0].body.anexo_nome, null);
    chamadas.length = 0;
    global.fetch = async () => ({ ok: false });
    await procurar(renderizar(), 'ModalFormAviso').props.onConfirm(formulario, arquivo, false);
    assert.ok(!chamadas.some(c => c.endpoint === 'AdicionarAviso' || c.endpoint === 'AtualizarAviso'));
    assert.equal(erros.length, 1);
  } finally { global.fetch = fetchOriginal; }

  const m = hooks();
  const deps = { react: m.react, 'react-hook-form': { Controller: 'Controller', useForm: () => ({ control: {}, reset() {}, handleSubmit: acao => () => acao(formulario) }) },
    '@/components/EditorMensagem': { default: 'EditorMensagem' }, '@/components/LabelPlus': { default: 'LabelPlus' },
    '@/hooks/usePermissoesModulo': { usePermissoesModulo: () => permissoes },
    '@/service/Api/ApiClient': { default: useApi }, '@/service/Util': util };
  for (const [pacote, nome] of [['button','Button'], ['calendar','Calendar'], ['dialog','Dialog'], ['inputswitch','InputSwitch'], ['inputtext','InputText'], ['multiselect','MultiSelect']]) deps['primereact/' + pacote] = { [nome]: nome };
  const Modal = carregar(caminho + 'ModalFormAviso.tsx', deps).default;
  let salvo;
  const renderizarModal = () => { m.reiniciar(); return Modal({ visible: true, data: { id: 4, anexo_nome: 'antigo.pdf', anexo_url: 'https://storage/antigo' }, onConfirm: (...args) => { salvo = args; } }); };
  function editor(arvore) {
    function controllers(no, lista = []) {
      if (Array.isArray(no)) { no.forEach(n => controllers(n, lista)); return lista; }
      if (!no?.props) return lista;
      if (no.type === 'Controller') lista.push(no);
      controllers(no.props.children, lista); return lista;
    }
    return procurar(controllers(arvore).find(c => c.props.name === 'mensagem').props.render({ field: { value: 'Texto', onChange() {} }, fieldState: {} }), 'EditorMensagem');
  }
  let arvore = renderizarModal();
  assert.equal(editor(arvore).props.comAnexo, true);
  assert.equal(editor(arvore).props.urlAnexo, 'https://storage/antigo');
  editor(arvore).props.onEscolherAnexo({ size: 17 * 1024 * 1024 });
  arvore = renderizarModal();
  assert.equal(editor(arvore).props.nomeAnexo, 'antigo.pdf', 'Arquivo grande não substitui o atual');
  editor(arvore).props.onEscolherAnexo(arquivo);
  arvore = renderizarModal();
  const urlLocal = editor(arvore).props.urlAnexo;
  assert.equal(editor(arvore).props.nomeAnexo, 'manual.pdf');
  assert.ok(urlLocal.startsWith('blob:'));
  await arvore.props.footer().props.children[1].props.onClick();
  assert.equal(salvo[1], arquivo);
  editor(arvore).props.onRemoverAnexo();
  arvore = renderizarModal();
  assert.equal(editor(arvore).props.nomeAnexo, null);
  assert.equal(editor(arvore).props.urlAnexo, null);
  permissoes.podeEditar = false;
  assert.equal(editor(renderizarModal()).props.disabled, true, 'Consulta sem permissão não permite anexar');
  URL.revokeObjectURL(urlLocal);
  console.log('Avisos: clipe compartilhado, prévia, limite, upload PUT, criação, edição, remoção e falha sem salvar validados. Sem rede real.');
})().catch(erro => { console.error(erro); process.exitCode = 1; });
