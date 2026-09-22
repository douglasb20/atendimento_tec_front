'use client';

import { useMemo } from 'react';

import { usePermissoes } from './usePermissoes';

/**
 * As quatro permissões de um módulo de cadastro, prontas para a interface.
 *
 * Existe para a regra viver num lugar só: as telas de cadastro repetiam
 * `pode('tag:add')`, `pode('tag:update')` e `pode('tag:delete')` cada uma à sua
 * maneira - umas escondendo, outras não -, e a próxima tela nascia copiando a
 * anterior.
 *
 * ## A convenção da interface
 *
 * - **Sem `:add`** → o botão "Adicionar" do cabeçalho fica **desabilitado**,
 *   não ausente: cinza comunica "existe e você não pode", ausente não diz nada.
 * - **Sem `:update`** → os campos do formulário e o botão Salvar ficam
 *   desabilitados. O cadastro **abre em somente leitura**, porque quem tem
 *   `:view` tem direito de consultar o detalhe.
 * - **Sem `:update`/`:delete`** → as ações **dentro da tabela** continuam
 *   **escondidas**. Dois ícones cinza repetidos em cinquenta linhas são ruído,
 *   e sem nenhuma das duas a coluna inteira ficaria cinza ocupando espaço.
 *
 * ⚠️ **Isto não é segurança** - vale o que está escrito em `usePermissoes`: o
 * cookie é editável pelo navegador, e quem o alterar consegue habilitar botões
 * e nada além. Toda ação escondida aqui precisa estar protegida no backend.
 *
 * @param recurso o prefixo do módulo, sem a ação: `tag`, `client`, `user`,
 *   `quick.reply`. É o mesmo que está gravado em `permissions.name`.
 */
export const usePermissoesModulo = (recurso: string) => {
  const { pode, carregado } = usePermissoes();

  return useMemo(
    () => ({
      podeVisualizar: pode(`${recurso}:view`),
      podeAdicionar: pode(`${recurso}:add`),
      podeEditar: pode(`${recurso}:update`),
      podeExcluir: pode(`${recurso}:delete`),

      /**
       * Ações fora do quarteto padrão, para módulos que têm as suas.
       *
       * Hoje só `channel:config` (conectar, desconectar e reiniciar a sessão
       * do WhatsApp), mas existe como função em vez de campo fixo para o
       * próximo módulo não precisar mexer neste hook.
       */
      podeAcao: (acao: string): boolean => pode(`${recurso}:${acao}`),

      /** Para o `title` do que está desabilitado. */
      semPermissao: 'Você não tem permissão para esta ação',

      /** `false` até o cookie ser lido - evita piscar o estado "sem acesso". */
      carregado,
    }),
    // `pode` nasce do `useMemo` de `usePermissoes`, que só muda com o cookie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recurso, pode, carregado],
  );
};
