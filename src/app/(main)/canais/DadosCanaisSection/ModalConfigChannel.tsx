import { memo } from 'react';
import QRCode from 'qrcode.react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Timeline } from 'primereact/timeline';
import { classNames } from 'primereact/utils';

import { ChannelResponse } from '@/Interfaces';

interface IProps<T> {
  visible: boolean;
  value?: T;
  onHide: () => void;
  onStartSession: () => void;
  onDisconnectSession: () => void;
}

const stepValues = [
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

const ModalConfigChannel = (props: IProps<ChannelResponse>) => {
  const { visible, onHide, value, onStartSession, onDisconnectSession } = props;

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
                disabled={value?.channel_status_id === 2}
                outlined
                severity={value?.channel_status_id === 1 ? 'success' : 'danger'}
              />
              <Button
                label={'Fechar sessão'}
                icon={PrimeIcons.SIGN_OUT}
                onClick={() => {
                  onDisconnectSession && onDisconnectSession();
                }}
                outlined
                severity={'info'}
                visible={value?.channel_status_id === 2}
              />
            </div>
          </div>
          {value?.channel_status_id === 2 && (
            <div className="col-12 grid px-4">
              <div className="field col-8 flex flex-column gap-3">
                <span className="mb-5 text-3xl font-semibold">Etapas para acessar</span>
                <Timeline
                  className="w-30rem "
                  value={stepValues}
                  align="left"
                  content={(item: (typeof stepValues)[number]) => item.status}
                  marker={(item: (typeof stepValues)[number]) => (
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
              <div className="field col-4 flex justify-content-center align-items-center">
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
                  />
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
