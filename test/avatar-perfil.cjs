// Executar em front/: node test/avatar-perfil.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');

(async () => {
  const estados = [], chamadas = [], uploads = [], erros = [];
  let indice = 0, salvo = false;
  const formulario = { name: 'Atendente', last_name: '', email: 'teste@example.com', senha: '', confirma_senha: '' };
  const AbaDados = carregar('src/components/ModalPerfil/AbaDados.tsx', {
    react: {
      useEffect() {}, useRef: () => ({ current: null }),
      useState: inicial => { const i = indice++; if (!(i in estados)) estados[i] = inicial;
        return [estados[i], valor => { estados[i] = typeof valor === 'function' ? valor(estados[i]) : valor; }]; },
    },
    'react-hook-form': { Controller: 'Controller', useForm: () => ({ control: {}, reset() {}, handleSubmit: salvar => () => salvar(formulario) }) },
    '@hookform/resolvers/yup': { yupResolver: () => ({}) }, './schemaPerfil': { schemaPerfil: {} },
    'primereact/button': { Button: 'Button' }, 'primereact/inputtext': { InputText: 'InputText' },
    'primereact/utils': { classNames: () => '' }, '@/components/Avatar': { default: 'Avatar' },
    '@/hooks/usePermissoes': { usePermissoes: () => ({ pode: nome => nome === 'user:profile_update', ehSuperusuario: false }) },
    '@/service/Api/ApiClient': { default: () => ({ FetchReq: async entrada => {
      chamadas.push(entrada);
      return entrada.endpoint === 'AssinarMeuAvatar' ? { url: 'https://storage/upload', key: 'user/avatar/foto.png', headers: {} } : {};
    } }) },
    '@/service/Util': { Alerta() {}, CatchAlerta: erro => erros.push(erro), getFormErrorMessage() {} },
  }).default;
  let arvore;
  const renderizar = () => { indice = 0; arvore = AbaDados({ perfil: { id: 7, ...formulario }, onSalvo: () => { salvo = true; } }); };
  function elementos(no, itens = []) {
    if (!arguments.length) no = arvore;
    if (Array.isArray(no)) { no.forEach(filho => elementos(filho, itens)); return itens; }
    if (!no?.props) return itens;
    itens.push(no); elementos(no.props.children, itens); return itens;
  }
  const fetchOriginal = global.fetch;
  try {
    global.fetch = async (url, opcoes) => { uploads.push({ url, opcoes }); return { ok: true }; };
    renderizar();
    const arquivo = new File(['foto'], 'foto.png', { type: 'image/png' });
    elementos().find(no => no.type === 'input' && no.props.type === 'file').props.onChange({ target: { files: [arquivo], value: 'foto.png' } });
    renderizar();
    await elementos().find(no => no.type === 'Button' && no.props.label === 'Salvar').props.onClick();
    assert.deepEqual(chamadas[0], { endpoint: 'AssinarMeuAvatar', body: { fileType: 'image/png' } });
    assert.equal(uploads[0].opcoes.method, 'PUT');
    assert.equal(uploads[0].opcoes.body, arquivo);
    assert.equal(chamadas[1].endpoint, 'AtualizarMeuPerfil');
    assert.equal(chamadas[1].body.avatar_url, 'user/avatar/foto.png');
    assert.equal(chamadas[1].body.changed_avatar, true);
    assert.equal('password' in chamadas[1].body, false);
    assert.equal(salvo, true);
    assert.equal(erros.length, 0);
    assert.ok(!chamadas.some(chamada => chamada.endpoint === 'AssinarAvatarUsuario'));
    console.log('Foto do perfil validada: seleção, assinatura própria, PUT e salvamento sem permissão administrativa. Sem rede real.');
  } finally {
    global.fetch = fetchOriginal;
    if (estados[2]?.startsWith('blob:')) URL.revokeObjectURL(estados[2]);
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
