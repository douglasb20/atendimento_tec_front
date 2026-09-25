'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { ProgressSpinner } from 'primereact/progressspinner';
import { classNames } from 'primereact/utils';

import { useNotificacaoDispositivo } from '@/hooks/useNotificacaoDispositivo';
import { PreferenciaParaTela, PreferenciasUsuario } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { Alerta, CatchAlerta } from '@/service/Util';
import { usePreferenciasStore } from '@/store/usePreferenciasStore';

type Props = {
  itens: PreferenciaParaTela[];
  carregando: boolean;
  /** Recarrega o cookie `userInfo` e o catálogo depois de salvar. */
  onSalvo: () => void;
};

type Secao = NonNullable<PreferenciaParaTela['secao']>;

/** Os títulos das seções, na ordem em que aparecem. */
const SECOES: { chave: Exclude<Secao, 'geral'>; titulo: string }[] = [
  { chave: 'mensagens', titulo: 'Mensagens' },
  { chave: 'movimentacoes', titulo: 'Movimentações' },
  { chave: 'entrega', titulo: 'Entrega' },
];

const ICONES: Record<string, string> = {
  notif_habilitadas: 'fa-regular fa-bell',
  notif_fila: 'fa-regular fa-clock',
  notif_mensagem_cliente: 'fa-regular fa-user-check',
  notif_chat_interno: 'fa-regular fa-users',
  notif_transferencia: 'fa-regular fa-arrow-right-arrow-left',
  notif_som: 'fa-regular fa-volume',
  notif_alerta_tela: 'fa-regular fa-message',
  notif_navegador: 'fa-regular fa-window-maximize',
};

/**
 * Onde a pessoa escolhe o que quer ser avisada, e como.
 *
 * Separa **o que** avisa (mensagens, movimentações) de **como** avisa (entrega),
 * com uma chave geral no topo - organização da referência que o usuário trouxe.
 *
 * Grava pelo botão Salvar, não a cada clique: com a chave geral, desligar e
 * religar para experimentar faria uma chamada por toque, e o Cancelar precisa
 * ter para onde voltar.
 */
const AbaNotificacoes = ({ itens, carregando, onSalvo }: Props) => {
  const { FetchReq } = useApi();
  const { permissao, bloqueada, indisponivel, pedirPermissao } = useNotificacaoDispositivo();
  const definir = usePreferenciasStore((s) => s.definir);

  const notificacoes = useMemo(
    () => itens.filter((item) => item.grupo === 'notificacoes'),
    [itens],
  );

  // O que está gravado, e o rascunho que a tela edita.
  const gravado = useMemo(
    () => Object.fromEntries(notificacoes.map((i) => [i.chave, i.valor === true])),
    [notificacoes],
  );
  const [rascunho, setRascunho] = useState<Record<string, boolean>>(gravado);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => setRascunho(gravado), [gravado]);

  const alterados = Object.keys(rascunho).filter((k) => rascunho[k] !== gravado[k]);
  const habilitadas = rascunho.notif_habilitadas !== false;

  const salvar = async () => {
    const preferencias = Object.fromEntries(alterados.map((k) => [k, rascunho[k]]));

    try {
      setSalvando(true);
      await FetchReq({ endpoint: 'AtualizarPreferencias', body: { preferencias } });

      // O disparo lê da store: sem isto, a mudança só valeria na próxima carga.
      definir(preferencias as Partial<PreferenciasUsuario>);
      onSalvo();
      Alerta('Preferências salvas', '', 'success');
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível salvar as preferências');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-content-center p-5">
        <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    );
  }

  // Função que desenha, e não componente: declarado aqui dentro, um
  // componente seria "novo" a cada render e remontaria os interruptores.
  const desenharItem = (item: PreferenciaParaTela, desabilitado = false) => (
    <div
      className={classNames(
        'flex align-items-center gap-3 border-1 surface-border border-round p-3',
        desabilitado && 'opacity-50',
      )}
    >
      <span
        className="flex align-items-center justify-content-center border-round surface-100 text-primary flex-shrink-0"
        style={{ width: '2.25rem', height: '2.25rem' }}
      >
        <i className={ICONES[item.chave] ?? 'fa-regular fa-bell'} />
      </span>

      <div className="flex-1">
        <span className="block font-medium">{item.rotulo}</span>
        <small className="text-color-secondary">{item.descricao}</small>
      </div>

      <InputSwitch
        checked={rascunho[item.chave] === true}
        disabled={desabilitado || salvando}
        onChange={(e) => setRascunho((atual) => ({ ...atual, [item.chave]: Boolean(e.value) }))}
      />
    </div>
  );

  const geral = notificacoes.find((i) => i.secao === 'geral');

  return (
    <div className="flex flex-column gap-3">
      {geral && desenharItem(geral)}

      {SECOES.map(({ chave, titulo }) => {
        const daSecao = notificacoes.filter((i) => i.secao === chave);
        if (!daSecao.length) return null;

        return (
          <div
            key={chave}
            className="flex flex-column gap-2"
          >
            <span className="text-xs font-bold text-color-secondary uppercase mt-2">{titulo}</span>

            {daSecao.map((item) => (
              <div key={item.chave}>
                {/* Com a chave geral desligada o resto fica apagado, mas
                    visível: a pessoa vê o que voltaria a valer ao religá-la. */}
                {desenharItem(item, !habilitadas)}

                {/* A permissão do navegador só importa para este canal. Ligar
                    sem concedê-la não faria nada, e sem a explicação pareceria
                    defeito. */}
                {item.chave === 'notif_navegador' && habilitadas && rascunho.notif_navegador && (
                  <div className="mt-2 ml-1">
                    {indisponivel && (
                      <small className="text-orange-500">
                        Este navegador não oferece notificações.
                      </small>
                    )}

                    {bloqueada && (
                      <small className="text-red-500">
                        Bloqueadas neste navegador. Para liberar, clique no cadeado ao lado do
                        endereço e permita as notificações.
                      </small>
                    )}

                    {permissao === 'default' && (
                      <Button
                        label="Permitir no navegador"
                        icon="fa-regular fa-bell"
                        size="small"
                        outlined
                        onClick={pedirPermissao}
                        style={{ width: 'auto' }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      <div className="flex justify-content-end gap-2 mt-2">
        <Button
          label="Cancelar"
          severity="secondary"
          outlined
          disabled={!alterados.length || salvando}
          onClick={() => setRascunho(gravado)}
          style={{ width: 'auto' }}
        />
        <Button
          label="Salvar"
          icon="fa-regular fa-check"
          loading={salvando}
          disabled={!alterados.length}
          onClick={salvar}
          style={{ width: 'auto' }}
        />
      </div>
    </div>
  );
};

export default AbaNotificacoes;
