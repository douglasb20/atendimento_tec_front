'use client';

import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Avatar from '@/components/Avatar';
import { ContactResponse } from '@/Interfaces';
import { DateToBR, Mask, nomeExibicao } from '@/service/Util';

type IdentificacaoContatoProps = {
  contato?: ContactResponse;
  /** Data da última movimentação da conversa. */
  ultimaInteracao?: string | null;
};

/**
 * Formata o telefone que vem do WhatsApp.
 *
 * O número chega no formato do JID (`556492698043`): código do país colado no
 * DDD. Mascarar direto faria o `55` virar DDD — daí o corte do prefixo antes.
 * Com o nono dígito são 11 números; sem ele, 10.
 */
const mascaraTelefone = (telefone?: string) => {
  if (!telefone) return null;

  let digitos = telefone.replace(/\D/g, '');

  // 12 ou 13 dígitos começando em 55 é número brasileiro com o país junto.
  if (digitos.startsWith('55') && digitos.length > 11) {
    digitos = digitos.slice(2);
  }

  if (digitos.length < 10) return telefone;

  // O WhatsApp omite o nono dígito no JID de vários DDDs, devolvendo o celular
  // com 8 números. Fixo começa em 2-5; de 6 em diante é celular, e aí o 9 que
  // falta é reposto para o número ficar discável.
  const [ddd, assinante] = [digitos.slice(0, 2), digitos.slice(2)];
  if (assinante.length === 8 && Number(assinante[0]) >= 6) {
    digitos = `${ddd}9${assinante}`;
  }

  return Mask(digitos, digitos.length > 10 ? '(##) # ####-####' : '(##) ####-####');
};

const IdentificacaoContato = ({ contato, ultimaInteracao }: IdentificacaoContatoProps) => {
  const telefone = mascaraTelefone(contato?.phone);
  const semCliente = !contato?.client_id;

  return (
    // `min-w-0` é o que permite o texto encolher com reticências dentro de um
    // flex; sem ele, o nome longo empurra os botões para fora do cabeçalho.
    <div className="flex flex-1 align-items-center gap-3 min-w-0">
      <Avatar
        src={contato?.avatar_url}
        alt={contato?.name ?? 'Contato'}
        width={46}
        height={46}
        className="border-circle flex-none"
        style={{ objectFit: 'cover' }}
      />

      <div className="flex flex-column gap-1 min-w-0">
        <div className="flex align-items-center gap-2 min-w-0">
          {/* O contraste com a linha de baixo é o que dá hierarquia aqui:
              nome grande e escuro, metadado pequeno e claro. */}
          <span
            className="text-xl font-semibold text-900 line-height-1 white-space-nowrap overflow-hidden text-overflow-ellipsis"
            title={nomeExibicao(contato)}
          >
            {nomeExibicao(contato)}
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

        {/* Some em tela estreita: o nome e as ações têm prioridade. */}
        <div className="hidden md:flex align-items-center gap-2 text-sm text-500 line-height-1 min-w-0">
          {telefone && <span className="white-space-nowrap">{telefone}</span>}
          {telefone && ultimaInteracao && <span className="text-300">•</span>}
          {ultimaInteracao && (
            <span
              className="white-space-nowrap overflow-hidden text-overflow-ellipsis"
              title={DateToBR(ultimaInteracao, 'P HH:mm')}
            >
              Última interação{' '}
              {formatDistanceToNowStrict(parseISO(ultimaInteracao), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdentificacaoContato;
