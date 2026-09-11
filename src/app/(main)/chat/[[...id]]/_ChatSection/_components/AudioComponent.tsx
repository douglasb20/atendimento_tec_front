import { classNames } from "primereact/utils";

export default function AudioComponent({
  onSendAudio,
  duration,
  onPause,
  onResume,
  onCancel,
  statusRecording,
}: {
  onSendAudio: () => void;
  duration: number;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  statusRecording: 'idle' | 'recording' | 'paused' | 'stopped' | 'sending';
}) {
  return (
    <div className="flex flex-row w-full p-fluid gap-2 py-1">
      <div className="w-full max-h-10rem shadow-none border-none flex align-items-center select-none pl-2">
        <span className="text-gray-500">
          {statusRecording === 'recording' && 'Gravando mensagem...'}
          {statusRecording === 'paused' && 'Pausado'}
          {statusRecording === 'sending' && 'Enviando mensagem...'}
        </span>
      </div>
      {statusRecording !== 'sending' && (
        <>
          <div className="flex align-items-center justify-content-center w-5rem select-none">
            <span className="text-900">
              {Math.floor(duration / 60)
                .toString()
                .padStart(2, '0')}
              :{(duration % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <button
            title={statusRecording === 'recording' ? 'Pausar mensagem' : 'Retomar mensagem'}
            className="flex cursor-pointer hover:bg-primary-100 justify-content-center align-items-center w-3rem h-3rem align-self-end border-circle border-none bg-transparent"
            onClick={() => {
              if (statusRecording === 'recording') {
                onPause();
              } else {
                onResume();
              }
            }}
          >
            <i
              className={`${statusRecording === 'recording' ? 'pi pi-pause' : 'fa-regular fa-microphone'} text-xl text-primary`}
            />
          </button>
          <button
            className="flex cursor-pointer hover:bg-red-700 justify-content-center align-items-center w-3rem h-3rem align-self-end border-circle border-none bg-red-500"
            onClick={onCancel}
            title="Cancelar gravação"
          >
            <i className={`pi pi-trash text-xl text-white`} />
          </button>
        </>
      )}

      <button
        className={
          classNames(
            {
              "pointer-events-none opacity-50": statusRecording === "sending",
            },
            "flex bg-primary-500 cursor-pointer hover:bg-primary-800 justify-content-center align-items-center w-3rem h-3rem align-self-end border-circle border-none"
          )
        }
        onClick={onSendAudio}
        title="Enviar mensagem de áudio"
        disabled={statusRecording === 'sending'}
      >
        {statusRecording === 'sending' ? (
          <i className="pi pi-spin pi-spinner text-xl text-white" />
        ) : (
          <i className={`fa-regular fa-send text-xl text-white`} />
        )}
      </button>
    </div>
  );
}

