import { memo, useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Timeline } from 'primereact/timeline';
import { classNames } from 'primereact/utils';

import InputTelefone, { paraE164, somenteDigitos } from '@/components/InputTelefone';
import { ChannelResponse } from '@/Interfaces';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

interface IProps<T> {
  visible: boolean;
  value?: T;
  onHide: () => void;
  onStartSession: (numero?: string) => void;
  onDisconnectSession: () => void;
  onSincronizarStatus: () => void;
  sincronizando?: boolean;
}

const stepValuesQrCode = [
  { status: <span>Abra o WhatsApp no seu celular.</span>, step: 1 },
  {
    status: (
      <span>
        Toque em Mais opções
        <i className="pi pi-ellipsis-v border-1 p-1 border-round-md bg-gray-100"></i> no Android ou
        em Configurações<i className="pi pi-cog border-1 p-1 border-round-md bg-gray-100"></i> no
        Iphone
      </span>
    ),
    step: 2,
  },
  {
    status: (
      <span>
        Toque em "<b>Dispositivos Conectados</b>" e, em seguida, em "<b>Conectar um Dispositivo</b>"
      </span>
    ),
    step: 3,
  },
  { status: <span>Escaneie o QR code para confirmar</span>, step: 4 },
];

/** Mesmos 4 passos, adaptados ao texto de pareamento por número - réplica do
 *  fluxo do WhatsApp Web oficial ("Entrar com número de telefone"). */
const stepValuesPairing = [
  { status: <span>Abra o WhatsApp no seu celular.</span>, step: 1 },
  {
    status: (
      <span>
        Toque em Mais opções
        <i className="pi pi-ellipsis-v border-1 p-1 border-round-md bg-gray-100"></i> no Android ou
        em Configurações<i className="pi pi-cog border-1 p-1 border-round-md bg-gray-100"></i> no
        Iphone
      </span>
    ),
    step: 2,
  },
  {
    status: (
      <span>
        Toque em "<b>Dispositivos Conectados</b>" e, em seguida, em "<b>Conectar um Dispositivo</b>"
      </span>
    ),
    step: 3,
  },
  {
    status: (
      <span>
        Toque em "<b>Conectar com número de telefone</b>" e insira o código exibido
      </span>
    ),
    step: 4,
  },
];

/** As três telas do fluxo, no mesmo espírito do WhatsApp Web oficial. */
type ModoConexao = 'qr' | 'telefone' | 'aguardando_codigo';

/** O código de pareamento em blocos de uma letra - réplica visual do print. */
const CodigoPareamento = ({ codigo }: { codigo: string }) => (
  <div className="flex gap-2 justify-content-center flex-wrap">
    {codigo.split('').map((caractere, indice) =>
      caractere === '-' ? (
        <span
          key={indice}
          className="flex align-items-center text-2xl text-500"
        >
          -
        </span>
      ) : (
        <span
          key={indice}
          className="flex align-items-center justify-content-center border-1 surface-border border-round font-bold text-2xl surface-100"
          style={{ width: '2.5rem', height: '3rem' }}
        >
          {caractere}
        </span>
      ),
    )}
  </div>
);

const ModalConfigChannel = (props: IProps<ChannelResponse>) => {
  const { podeAcao, semPermissao } = usePermissoesModulo('channel');

  // O modal só abre com a permissão, mas os botões a checam de novo: o cookie
  // pode ter sido renovado sem ela enquanto a tela estava aberta, e aí a
  // chamada voltaria 403 depois de o atendente achar que desconectou.
  const podeConfigurar = podeAcao('config');
  const {
    visible,
    onHide,
    value,
    onStartSession,
    onDisconnectSession,
    onSincronizarStatus,
    sincronizando = false,
  } = props;

  const [modo, setModo] = useState<ModoConexao>('qr');
  const [numero, setNumero] = useState<string | undefined>(undefined);

  // Volta ao QR (o padrão) sempre que o modal reabre ou o canal muda de
  // status - sem isto o formulário de telefone ficaria na tela depois de
  // conectar, ou reaparecia sozinho ao reabrir outro canal.
  useEffect(() => {
    if (!visible) return;
    setModo('qr');
    setNumero(undefined);
  }, [visible, value?.id]);

  // O código chegou (a Evolution respondeu ao pedido de pareamento): avança
  // para a tela que o exibe, sem exigir um clique a mais.
  useEffect(() => {
    if (value?.pairing_code) setModo('aguardando_codigo');
  }, [value?.pairing_code]);

  const pedirPareamento = () => {
    const digitos = somenteDigitos(numero);
    if (!digitos) return;
    onStartSession(digitos);
  };

  return (
    <>
      <Modal
        resizable={false}
        header={`${value?.name} `}
        visible={visible}
        className="w-11 md:w-12 lg:w-6 mt-8 "
        style={{ maxWidth: '40vw', minWidth: '40vw' }}
        onHide={onHide}
        blockScroll
        closeOnEscape={false}
        position="top"
      >
        <div className="formgrid grid row-gap-5 ">
          <div className="col-12 flex gap-2">
            <div className="flex-grow-1 flex align-items-center ">
              <span
                className={classNames(
                  {
                    'p-button-success': value?.channel_status_id === 3,
                    'p-button-danger': value?.channel_status_id !== 3,
                  },
                  'flex justify-content-center align-items-center gap-2 p-button p-button-rounded mr-3 cursor-auto',
                )}
              >
                <i
                  className={classNames(
                    {
                      'pi-check': value?.channel_status_id === 3,
                      'pi-times': value?.channel_status_id !== 3,
                    },
                    'pi',
                  )}
                ></i>
                {value?.channel_status_id === 3 ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="flex-shrink-0 flex justify-content-center align-items-center gap-2 ">
              {/* O status guardado vem do último evento recebido, e evento se
                  perde: este botão pergunta ao provider e corrige o registro. */}
              <Button
                icon={PrimeIcons.SYNC}
                onClick={() => onSincronizarStatus && onSincronizarStatus()}
                loading={sincronizando}
                outlined
                severity="secondary"
                tooltip="Verificar status real no WhatsApp"
                tooltipOptions={{ position: 'bottom' }}
                aria-label="Verificar status real"
              />
              <Button
                label={value?.channel_status_id === 1 ? 'Iniciar sessão' : 'Desconectar'}
                icon={value?.channel_status_id === 1 ? PrimeIcons.SIGN_IN : PrimeIcons.TIMES}
                onClick={() => {
                  if (value?.channel_status_id === 1) {
                    onStartSession && onStartSession();
                  } else if (value?.channel_status_id === 3) {
                    onDisconnectSession && onDisconnectSession();
                  }
                }}
                disabled={!podeConfigurar || value?.channel_status_id === 2}
                title={podeConfigurar ? undefined : semPermissao}
                outlined
                severity={value?.channel_status_id === 1 ? 'success' : 'danger'}
              />
              <Button
                label={'Fechar sessão'}
                icon={PrimeIcons.SIGN_OUT}
                disabled={!podeConfigurar}
                title={podeConfigurar ? undefined : semPermissao}
                onClick={() => {
                  onDisconnectSession && onDisconnectSession();
                }}
                outlined
                severity={'info'}
                visible={value?.channel_status_id === 2}
              />
            </div>
          </div>
          {value?.channel_status_id === 2 && modo === 'qr' && (
            <div className="col-12 grid px-4">
              <div className="field col-8 flex flex-column gap-3">
                <span className="mb-5 text-3xl font-semibold">Etapas para acessar</span>
                <Timeline
                  className="w-30rem "
                  value={stepValuesQrCode}
                  align="left"
                  content={(item: (typeof stepValuesQrCode)[number]) => item.status}
                  marker={(item: (typeof stepValuesQrCode)[number]) => (
                    <div className="bg-teal-100 flex justify-content-center align-items-center border-teal-400 border-1 border-circle h-2rem w-2rem p-1">
                      <span className="font-bold text-teal-600">{item.step}</span>
                    </div>
                  )}
                  pt={{
                    opposite: {
                      className: 'hidden',
                    },
                  }}
                />
              </div>
              <div className="field col-4 flex flex-column justify-content-center align-items-center gap-3">
                {!value?.qr_code && (
                  <div className="flex flex-column justify-content-center align-items-center ">
                    <ProgressSpinner className="mb-3 w-4rem h-4rem" />
                    <span className="font-semibold text-xl">Solicitando QRCode</span>
                    <span>Por favor, aguarde...</span>
                  </div>
                )}
                {value?.qr_code && (
                  <QRCode
                    size={254}
                    value={value?.qr_code || ''}
                    // A margem branca em volta ("zona de silêncio") é o que o
                    // leitor usa para achar onde o código começa. Na v3 ela
                    // vem desligada: no tema claro o fundo branco do modal a
                    // fazia sem ninguém notar, e no escuro os cantos pretos
                    // encostavam no fundo escuro - o celular não lia.
                    includeMargin
                    // Explícitas para nenhum tema interferir: o leitor precisa
                    // de escuro sobre claro, sempre.
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                )}

                {/* Réplica do WhatsApp Web oficial: o link fica abaixo do QR,
                    e leva ao formulário de telefone - as duas modalidades
                    coexistem, o atendente escolhe a cada tentativa. */}
                <span
                  className="text-primary underline cursor-pointer text-sm"
                  onClick={() => setModo('telefone')}
                >
                  Entrar com número de telefone
                </span>
              </div>
            </div>
          )}

          {value?.channel_status_id === 2 && modo === 'telefone' && (
            <div className="col-12 flex flex-column align-items-center gap-4 px-4 py-5">
              <div
                className="flex flex-column gap-3"
                style={{ maxWidth: '22rem', width: '100%' }}
              >
                <span className="text-2xl font-semibold text-center">
                  Insira o número de telefone
                </span>
                <span className="text-color-secondary text-sm text-center">
                  Selecione o país e insira o número, com WhatsApp já ativo nele.
                </span>

                <InputTelefone
                  value={numero}
                  onChange={setNumero}
                />

                <Button
                  label="Avançar"
                  onClick={pedirPareamento}
                  disabled={!somenteDigitos(numero)}
                />

                <span
                  className="text-primary underline cursor-pointer text-sm text-center"
                  onClick={() => setModo('qr')}
                >
                  Conectar com o QR code
                </span>
              </div>
            </div>
          )}

          {value?.channel_status_id === 2 && modo === 'aguardando_codigo' && (
            <div className="col-12 grid px-4">
              <div className="field col-8 flex flex-column gap-3">
                <span className="text-xl font-semibold">
                  Conectando a conta do WhatsApp{' '}
                  <span className="font-normal text-color-secondary">
                    {paraE164(numero) ?? numero}
                  </span>{' '}
                  <span
                    className="text-primary underline cursor-pointer text-base"
                    onClick={() => setModo('telefone')}
                  >
                    (Editar)
                  </span>
                </span>

                <Timeline
                  className="w-30rem "
                  value={stepValuesPairing}
                  align="left"
                  content={(item: (typeof stepValuesPairing)[number]) => item.status}
                  marker={(item: (typeof stepValuesPairing)[number]) => (
                    <div className="bg-teal-100 flex justify-content-center align-items-center border-teal-400 border-1 border-circle h-2rem w-2rem p-1">
                      <span className="font-bold text-teal-600">{item.step}</span>
                    </div>
                  )}
                  pt={{
                    opposite: {
                      className: 'hidden',
                    },
                  }}
                />

                <span
                  className="text-primary underline cursor-pointer text-sm"
                  onClick={() => setModo('qr')}
                >
                  Conectar com o QR code
                </span>
              </div>
              <div className="field col-4 flex flex-column justify-content-center align-items-center gap-3">
                {!value?.pairing_code ? (
                  <div className="flex flex-column justify-content-center align-items-center ">
                    <ProgressSpinner className="mb-3 w-4rem h-4rem" />
                    <span className="font-semibold text-xl">Gerando código</span>
                    <span>Por favor, aguarde...</span>
                  </div>
                ) : (
                  <CodigoPareamento codigo={value.pairing_code} />
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default memo(ModalConfigChannel);
