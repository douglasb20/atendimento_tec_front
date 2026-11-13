// Executar em front/: node test/validacao-perfil.cjs
const assert = require('node:assert/strict');
const { carregar } = require('./selecao-atendimentos.cjs');
const { schemaPerfil } = carregar('src/components/ModalPerfil/schemaPerfil.ts', {
  '@/service/Util': { msgRequired: 'Obrigatório', ValidaEmail: valor => /^[^@]+@[^@]+\.[^@]+$/.test(valor) },
});

(async () => {
  const perfil = { name: 'Douglas', last_name: 'Amaro', email: 'teste@example.com' };
  const apenasNome = await schemaPerfil.validate({ ...perfil, name: 'Nome alterado', senha: '', confirma_senha: '' });
  assert.equal(apenasNome.name, 'Nome alterado');
  assert.equal(apenasNome.senha, undefined);
  await schemaPerfil.validate(perfil);
  await schemaPerfil.validate({ ...perfil, senha: null, confirma_senha: null });
  await assert.rejects(schemaPerfil.validate({ ...perfil, senha: '12345', confirma_senha: '12345' }), /6 caracteres/);
  for (const confirma_senha of ['', undefined, null]) {
    await assert.rejects(schemaPerfil.validate({ ...perfil, senha: '123456', confirma_senha }), /Confirme a nova senha/);
  }
  await assert.rejects(schemaPerfil.validate({ ...perfil, senha: '123456', confirma_senha: 'diferente' }), /não conferem/);
  const novaSenha = await schemaPerfil.validate({ ...perfil, senha: ' senha ', confirma_senha: ' senha ' });
  assert.equal(novaSenha.senha, ' senha ', 'Não deve remover espaços da senha');
  await schemaPerfil.validate({ ...perfil, senha: '123456', confirma_senha: '123456' });
  console.log('Perfil validado: senha opcional, mínimo de seis caracteres, confirmação condicional e preservação da senha digitada.');
})().catch(erro => { console.error(erro); process.exitCode = 1; });
