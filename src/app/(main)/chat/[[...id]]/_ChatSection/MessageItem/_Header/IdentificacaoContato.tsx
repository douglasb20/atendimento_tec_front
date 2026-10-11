'use client';

import { classNames } from 'primereact/utils';

import Avatar from '@/components/Avatar';
import { ContactResponse } from '@/Interfaces';
import { mascaraTelefone, nomeCompleto, nomeExibicao } from '@/service/Util';

type IdentificacaoContatoProps = {
  contato?: ContactResponse;
  /** Abre o painel com os dados completos. */
  onAbrirDetalhes?: () => void;
};

const IdentificacaoContato = ({
  contato,
  onAbrirDetalhes,
}: IdentificacaoContatoProps) => {
  const telefone = mascaraTelefone(contato?.phone);
  const semCliente = !contato?.client_id;

  // Mesma hierarquia da lista lateral: o cliente é quem nomeia a conversa, e o
  // contato vira subtítulo. Sem cliente, o contato sobe para o título - repetir
  // o mesmo nome nas duas linhas seria ruído.
  const cliente = contato?.client?.nome?.trim();
  const nomeContato = nomeCompleto(contato) || 'Contato';
  const titulo = cliente || nomeContato;

  return (
    // `min-w-0` é o que permite o texto encolher com reticências dentro de um
    // flex; sem ele, o nome longo empurra os botões para fora do cabeçalho.
    <button
      type="button"
      onClick={onAbrirDetalhes}
      disabled={!onAbrirDetalhes}
      title={onAbrirDetalhes ? 'Ver dados do cliente e do contato' : undefined}
      className={classNames(
        'flex flex-1 align-items-center gap-3 min-w-0 p-link text-left border-round p-1',
        onAbrirDetalhes &&
          'cursor-pointer hover:surface-hover transition-colors transition-duration-150',
      )}
    >
      <Avatar
        src={contato?.avatar_url}
        alt={nomeContato}
        width={56}
        height={56}
        className="border-circle flex-none"
        style={{ objectFit: 'cover' }}
      />

      <div className="flex flex-column min-w-0">
        <div className="flex align-items-center gap-2 min-w-0">
          {/* O contraste com a linha de baixo é o que dá hierarquia aqui:
              nome grande e escuro, metadado pequeno e claro. */}
          <span
            // `line-height-1` com `overflow-hidden` recortava o topo das
            // maiúsculas (o "G" do nome): a caixa fica menor que a fonte.
            // `line-height-2` sobra abaixo da linha e afastava o contato, daí
            // o `line-height-3` (1.5) - folga suficiente para a maiúscula,
            // sem o vão.
            className="text-xl font-semibold text-900 line-height-3 white-space-nowrap overflow-hidden text-overflow-ellipsis"
            title={nomeExibicao(contato)}
          >
            {titulo}
          </span>

          {/* Anuncia desde já a pendência que vai barrar a finalização, em vez
              de deixar o atendente descobrir só na hora de encerrar. */}
          {semCliente && (
            <span
              className="flex align-items-center gap-1 flex-none border-1 border-orange-300 border-round-3xl text-orange-700 px-2 text-xs font-medium white-space-nowrap"
              title="Associe um cliente para poder finalizar o atendimento"
            >
              <i className="fa-regular fa-circle-exclamation" />
              Sem cliente
            </span>
          )}
        </div>

        {/* O contato só aparece quando há cliente: sem ele, já está no título. */}
        {cliente && (
          <span
            className="text-sm font-semibold text-500 line-height-1 white-space-nowrap overflow-hidden text-overflow-ellipsis"
            title={nomeContato}
          >
            {nomeContato}
          </span>
        )}

        {/* Some em tela estreita: o nome e as ações têm prioridade. */}
        <div className="hidden md:flex align-items-center gap-2 text-sm text-500 line-height-1 min-w-0 mt-1">
          {telefone && <span className="white-space-nowrap">{telefone}</span>}
        </div>
      </div>
    </button>
  );
};

export default IdentificacaoContato;
