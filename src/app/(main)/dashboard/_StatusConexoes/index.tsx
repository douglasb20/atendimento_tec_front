'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ChannelResponse, ChannelStatusId } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

/**
 * Como cada estado se mostra.
 *
 * Cor **e** rótulo: a bolinha sozinha não diz nada a quem não distingue verde
 * de vermelho, e "Conectando" e "Sessão expirada" exigem ações diferentes.
 */
const APARENCIA: Record<number, { rotulo: string; cor: string }> = {
  [ChannelStatusId.CONECTADO]: { rotulo: 'Conectado', cor: 'green' },
  [ChannelStatusId.CONECTANDO]: { rotulo: 'Conectando', cor: 'orange' },
  [ChannelStatusId.DESCONECTADO]: { rotulo: 'Desconectado', cor: 'red' },
  [ChannelStatusId.SESSAO_EXPIRADA]: { rotulo: 'Sessão expirada', cor: 'red' },
};

const StatusConexoes = () => {
  const { FetchReq } = useApi();
  const [canais, setCanais] = useState<ChannelResponse[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const dados = await FetchReq<ChannelResponse[]>('ListarCanais');
        // O excluído não é um canal com problema - ele não existe mais.
        if (ativo) {
          setCanais((dados ?? []).filter((c) => c.channel_status_id !== ChannelStatusId.EXCLUIDO));
        }
      } catch (err) {
        CatchAlerta(err, 'Não foi possível carregar as conexões');
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    carregar();

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const foraDoAr = canais.filter((c) => c.channel_status_id !== ChannelStatusId.CONECTADO).length;

  return (
    <div className="card h-full mb-0 flex flex-column">
      <div className="flex align-items-center justify-content-between gap-2 mb-3">
        <span className="text-900 font-semibold">Conexões</span>
        {/* O atalho só aparece com algo a resolver: sem problema, a tela de
            conexões não é onde o atendente precisa estar. */}
        {!carregando && foraDoAr > 0 && (
          <Link
            href="/conexoes"
            className="text-sm text-primary no-underline hover:underline"
          >
            Resolver
          </Link>
        )}
      </div>

      {carregando ? (
        <div className="flex flex-column gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="surface-200 border-round"
              style={{ height: '3rem' }}
            />
          ))}
        </div>
      ) : canais.length === 0 ? (
        <span className="text-500 text-sm">Nenhuma conexão cadastrada.</span>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-column gap-2 overflow-y-auto">
          {canais.map((canal) => {
            const aparencia = APARENCIA[canal.channel_status_id] ?? {
              rotulo: 'Desconhecido',
              cor: 'gray',
            };

            return (
              <li
                key={canal.id}
                className="flex align-items-center gap-2 surface-hover border-round p-2"
              >
                <span
                  className="border-circle flex-none"
                  style={{
                    width: '0.6rem',
                    height: '0.6rem',
                    backgroundColor: `var(--${aparencia.cor}-500)`,
                  }}
                />
                <span className="flex-1 min-w-0 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                  {canal.name}
                </span>
                <span className="text-500 text-sm flex-none">{aparencia.rotulo}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default StatusConexoes;
