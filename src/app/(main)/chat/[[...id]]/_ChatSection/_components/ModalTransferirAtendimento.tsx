'use client';

import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { useEffect, useState } from 'react';

import useApi from '@/service/Api/ApiClient';
import { SupportChatsResponse } from '@/Interfaces';
import { UserResponse } from '@/Interfaces/user.interface';
import { Alerta, CatchAlerta, nomeCompleto } from '@/service/Util';

type ModalTransferirAtendimentoProps = {
  visible: boolean;
  onHide: () => void;
  chat: SupportChatsResponse;
  onTransferido: (chat: SupportChatsResponse) => void;
};

const LIMITE_MOTIVO = 1000;

/** Valor do seletor que representa "devolver para a espera". */
const PARA_ESPERA = -1;

/**
 * Passa o atendimento adiante.
 *
 * São dois caminhos na mesma tela porque são a mesma decisão vista de ângulos
 * diferentes: "quem continua isto?" pode ter como resposta uma pessoa ou
 * ninguém em particular. Separá-los em duas ações faria o atendente escolher a
 * ação antes de saber a resposta.
 */
const ModalTransferirAtendimento = ({
  visible,
  onHide,
  chat,
  onTransferido,
}: ModalTransferirAtendimentoProps) => {
  const { FetchReq } = useApi();
  const [atendentes, setAtendentes] = useState<UserResponse[]>([]);
  const [destino, setDestino] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [transferindo, setTransferindo] = useState(false);
  const [carregandoAtendentes, setCarregandoAtendentes] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setDestino(null);
    setMotivo('');

    const carregar = async () => {
      try {
        setCarregandoAtendentes(true);
        const lista = await FetchReq<UserResponse[]>('ListarUsuarios');

        // Transferir para si mesmo é recusado pela API; tirar da lista evita
        // oferecer a opção só para negá-la depois.
        setAtendentes((lista ?? []).filter((u) => Number(u.id) !== Number(chat?.user_id)));
      } catch (erro) {
        CatchAlerta(erro, 'Não foi possível carregar os atendentes');
      } finally {
        setCarregandoAtendentes(false);
      }
    };

    carregar();
    // `FetchReq` nasce a cada render do hook e entraria em laço aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, chat?.user_id]);

  const opcoes = [
    {
      label: 'Devolver para a espera',
      value: PARA_ESPERA,
      descricao: 'A conversa fica sem dono, e qualquer atendente pode assumi-la',
    },
    ...atendentes.map((atendente) => ({
      label: nomeCompleto(atendente),
      value: Number(atendente.id),
      descricao: atendente.email,
    })),
  ];

  const transferir = async () => {
    try {
      setTransferindo(true);

      const atualizado = await FetchReq<SupportChatsResponse>({
        endpoint: 'TransferirAtendimentoChat',
        variables: [chat.id],
        body: {
          // A API trata a ausência do campo como "devolver para a espera".
          user_destino_id: destino === PARA_ESPERA ? undefined : destino,
          motivo: motivo.trim() || undefined,
        },
      });

      onTransferido(atualizado);
      onHide();
      Alerta(
        destino === PARA_ESPERA
          ? 'Atendimento devolvido para a espera!'
          : 'Atendimento transferido com sucesso!',
        'Aviso',
        'success',
      );
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível transferir o atendimento');
    } finally {
      setTransferindo(false);
    }
  };

  const itemTemplate = (opcao: { label: string; descricao: string }) => (
    <div className="flex flex-column">
      <span className="font-medium">{opcao.label}</span>
      <small className="text-500">{opcao.descricao}</small>
    </div>
  );

  const rodape = () => (
    <div className="flex justify-content-between">
      <Button
        label="Cancelar"
        severity="danger"
        outlined
        onClick={onHide}
        disabled={transferindo}
        // O tema estica todo botão dentro de `p-fluid`; sem isto os dois
        // ocupariam metade do rodapé cada um.
        style={{ width: 'auto' }}
      />
      <Button
        label="Transferir"
        icon="fa-regular fa-right-left"
        loading={transferindo}
        disabled={destino === null}
        tooltip={destino === null ? 'Escolha para quem transferir' : undefined}
        tooltipOptions={{ position: 'top', showOnDisabled: true }}
        onClick={transferir}
        style={{ width: 'auto' }}
      />
    </div>
  );

  return (
    <Modal
      modal
      className="p-fluid"
      style={{ width: '38rem' }}
      breakpoints={{ '640px': '95vw' }}
      visible={visible}
      header="Transferir atendimento"
      onHide={onHide}
      footer={rodape}
    >
      <div className="flex flex-column gap-3">
        <div>
          <label
            htmlFor="destino"
            className="block mb-2 font-medium"
          >
            Transferir para
          </label>
          <Dropdown
            inputId="destino"
            value={destino}
            options={opcoes}
            onChange={(e) => setDestino(e.value)}
            optionLabel="label"
            itemTemplate={itemTemplate}
            filter
            filterBy="label"
            loading={carregandoAtendentes}
            placeholder="Escolha um atendente"
            emptyMessage="Nenhum outro atendente cadastrado"
            emptyFilterMessage="Nenhum atendente encontrado"
          />
        </div>

        <div>
          <label
            htmlFor="motivo"
            className="block mb-2 font-medium"
          >
            Motivo
          </label>
          <InputTextarea
            id="motivo"
            rows={3}
            autoResize
            maxLength={LIMITE_MOTIVO}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por que está transferindo? (opcional)"
          />
          <small className="block mt-1 text-right text-500">
            {motivo.length}/{LIMITE_MOTIVO}
          </small>
        </div>

        <small className="text-500">
          Quem receber o atendimento passa a ser responsável por finalizá-lo.
        </small>
      </div>
    </Modal>
  );
};

export default ModalTransferirAtendimento;
