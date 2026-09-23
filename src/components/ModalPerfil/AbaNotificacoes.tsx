'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';

import { useNotificacaoDispositivo } from '@/hooks/useNotificacaoDispositivo';
import { usePreferenciasStore } from '@/store/usePreferenciasStore';
import { PreferenciaParaTela } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

type Props = {
  itens: PreferenciaParaTela[];
  carregando: boolean;
  /** Recarrega o cookie `userInfo`, para as preferências valerem já. */
  onSalvo: () => void;
};

/**
 * Onde a pessoa escolhe o que quer ser avisada.
 *
 * ⚠️ São **duas** camadas, e a tela precisa mostrar as duas: a permissão do
 * navegador (que vale para o site inteiro) e a preferência por evento. Ligar a
 * segunda sem conceder a primeira não faz nada, e sem esta explicação pareceria
 * defeito.
 */
const AbaNotificacoes = ({ itens, carregando, onSalvo }: Props) => {
  const { FetchReq } = useApi();
  const { permissao, permitida, bloqueada, indisponivel, pedirPermissao } =
    useNotificacaoDispositivo();

  // O disparo lê da store: sem isto, ligar uma opção só valeria na próxima
  // carga de página.
  const definirUma = usePreferenciasStore((s) => s.definirUma);

  // Otimista: o switch vira na hora e a chamada acontece atrás. Esperar a
  // resposta deixaria o controle travado por um instante a cada clique.
  const [valores, setValores] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const notificacoes = itens.filter((item) => item.grupo === 'notificacoes');

  const valorDe = (item: PreferenciaParaTela) =>
    valores[item.chave] ?? (item.valor as boolean);

  const alternar = async (item: PreferenciaParaTela, ligado: boolean) => {
    setValores((atual) => ({ ...atual, [item.chave]: ligado }));
    setSalvando(item.chave);

    try {
      await FetchReq({
        endpoint: 'AtualizarPreferencias',
        body: { preferencias: { [item.chave]: ligado } },
      });

      definirUma(item.chave, ligado);
      onSalvo();
    } catch (erro) {
      // Desfaz o otimismo: deixar o switch na posição nova mentiria sobre o
      // que está gravado.
      setValores((atual) => ({ ...atual, [item.chave]: !ligado }));
      CatchAlerta(erro, 'Não foi possível salvar a preferência');
    } finally {
      setSalvando(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-content-center p-5">
        <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-column gap-3">
      {indisponivel && (
        <Message
          severity="warn"
          text="Este navegador não oferece notificações. O som continua funcionando."
        />
      )}

      {bloqueada && (
        <Message
          severity="error"
          // O navegador não pergunta de novo depois de negada: só o próprio
          // usuário reverte, e ele precisa saber onde.
          text="As notificações estão bloqueadas para este site. Para liberar, clique no cadeado ao lado do endereço e permita as notificações."
        />
      )}

      {permissao === 'default' && (
        <div className="surface-100 border-round p-3 flex flex-column sm:flex-row sm:align-items-center gap-3">
          <div className="flex-1">
            <span className="block font-medium">Permitir notificações</span>
            <small className="text-color-secondary">
              O navegador vai pedir sua confirmação. Sem ela, os avisos abaixo não aparecem.
            </small>
          </div>
          <Button
            label="Permitir"
            icon="fa-regular fa-bell"
            onClick={pedirPermissao}
            style={{ width: 'auto' }}
          />
        </div>
      )}

      {permitida && (
        <Message
          severity="success"
          text="As notificações estão liberadas neste navegador."
        />
      )}

      <p className="mt-2 mb-0 text-color-secondary">
        Escolha o que deve chegar como aviso do sistema. Você é avisado mesmo com o portal
        em outra aba, minimizado ou em segundo plano.
      </p>

      <div className="flex flex-column gap-2">
        {notificacoes.map((item) => (
          <div
            key={item.chave}
            className="flex align-items-center gap-3 border-1 surface-border border-round p-3"
          >
            <div className="flex-1">
              <span className="block font-medium">{item.rotulo}</span>
              <small className="text-color-secondary">{item.descricao}</small>
            </div>

            <InputSwitch
              checked={valorDe(item)}
              onChange={(e) => alternar(item, Boolean(e.value))}
              // Desabilitar sem permissão deixaria a pessoa sem entender por
              // quê; ela pode escolher agora e liberar depois.
              disabled={salvando === item.chave}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AbaNotificacoes;
