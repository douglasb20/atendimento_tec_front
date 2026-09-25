import { Handle, NodeProps, Position } from '@xyflow/react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressBar } from 'primereact/progressbar';
import { useRef, useState } from 'react';

import { ChatbotMessageNodeData, ChatbotMessageType, SignatureResponse } from '@/Interfaces';
import LabelPlus from '@/components/LabelPlus';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

import RemoverNoButton from './RemoverNoButton';

const TIPOS_MENSAGEM: { id: ChatbotMessageType; name: string }[] = [
  { id: 'text', name: 'Texto' },
  { id: 'image', name: 'Imagem' },
  { id: 'audio', name: 'Áudio' },
  { id: 'video', name: 'Vídeo' },
  { id: 'document', name: 'Arquivo' },
];

const ORIGENS_ANEXO = [
  { id: 'upload', name: 'Arquivo enviado', icon: PrimeIcons.UPLOAD },
  { id: 'variable', name: 'Variável', icon: PrimeIcons.HASHTAG },
] as const;

const CONTINUAR = [
  { id: 'auto', name: 'Automaticamente' },
  { id: 'after_reply', name: 'Após resposta' },
];

/** `accept` do input de arquivo, por tipo de mensagem - mesmo padrão do `SendMessageBox` do chat. */
const ACCEPT_POR_TIPO: Record<string, string> = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  document: '*/*',
};

type MessageNodeData = Partial<ChatbotMessageNodeData> & {
  onChange?: (data: ChatbotMessageNodeData) => void;
  onRemove?: () => void;
};

/**
 * O nó Mensagem - configurável inline no próprio card, sem modal (o usuário
 * pediu explicitamente: "tem nós que não tem necessidade de modal, dá pra
 * configurar nele mesmo"). Cresce em altura conforme o tipo escolhido, sem
 * `style={{width}}` fixo estreito como os demais nós - precisa de espaço para
 * os campos.
 *
 * Todo campo interativo leva `nodrag`: sem isso, clicar/digitar num
 * Dropdown/InputText dentro do nó inicia o arraste dele pelo canvas (é a
 * classe que o próprio React Flow reconhece e ignora ao decidir se o clique
 * arrasta o nó ou vai para o elemento).
 */
function MessageNode({ data, selected }: NodeProps) {
  const nodeData = data as MessageNodeData;
  const { FetchReq } = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const messageType = nodeData.messageType ?? 'text';
  const attachmentSource = nodeData.attachmentSource ?? 'upload';
  const continueOn = nodeData.continueOn ?? 'auto';
  const ehMidia = messageType !== 'text';

  const atualizar = (patch: Partial<ChatbotMessageNodeData>) => {
    nodeData.onChange?.({
      messageType,
      value: nodeData.value ?? '',
      attachmentSource,
      attachmentKey: nodeData.attachmentKey,
      attachmentFileName: nodeData.attachmentFileName,
      attachmentMimetype: nodeData.attachmentMimetype,
      attachmentVariable: nodeData.attachmentVariable,
      continueOn,
      ...patch,
    });
  };

  const abrirSeletorDeArquivo = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = ACCEPT_POR_TIPO[messageType] ?? '*/*';
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const onArquivoSelecionado = async (arquivo: File | undefined) => {
    if (!arquivo) return;

    try {
      setEnviando(true);

      const assinatura = await FetchReq<SignatureResponse>({
        endpoint: 'AssinarMediaChatbot',
        body: { fileType: arquivo.type, fileName: arquivo.name },
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', assinatura.url);
        Object.entries(assinatura.headers ?? {}).forEach(([chave, valor]) =>
          xhr.setRequestHeader(chave, valor),
        );
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(xhr.statusText || 'Falha no upload'));
        xhr.onerror = () => reject(new Error('Falha de rede durante o upload'));
        xhr.send(arquivo);
      });

      atualizar({
        attachmentKey: assinatura.key,
        attachmentFileName: arquivo.name,
        attachmentMimetype: arquivo.type,
      });
    } catch (err) {
      CatchAlerta(err, 'Erro ao subir o arquivo');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className={`border-round-lg shadow-2 surface-card border-1 pb-3 ${
        selected ? 'border-primary' : 'border-300'
      }`}
      style={{ width: '28rem' }}
    >

      <Handle
        type="target"
        position={Position.Top}
        style={{ padding: "0.450rem", zIndex: 1 }}
        className='border-2 border-700'
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ padding: "0.450rem", zIndex: 1 }}
        className='border-2 border-700'
      />
      

      <div className="flex align-items-center justify-content-between gap-2 p-2 border-round-top-lg surface-100">
        <div className="flex align-items-center gap-2">
          <i className={`${PrimeIcons.COMMENT} text-primary`} />
          <div className="flex flex-column">
            <span className="text-xs text-color-secondary uppercase">Chatbot</span>
            <span className="text-lg font-semibold text-primary">Mensagem</span>
          </div>
        </div>
        <RemoverNoButton onRemove={nodeData.onRemove} />
      </div>

      <div className="flex flex-column gap-3 p-2">
        <div>
          <LabelPlus text="Tipo de Mensagem" />
          <Dropdown
            className="nodrag w-full"
            value={messageType}
            onChange={(e) => atualizar({ messageType: e.value })}
            options={TIPOS_MENSAGEM}
            optionLabel="name"
            optionValue="id"
          />
        </div>

        {ehMidia && (
          <>
            <div>
              <LabelPlus text="Origem do anexo" />
              <div className="flex gap-2">
                {ORIGENS_ANEXO.map((origem) => (
                  <Button
                    key={origem.id}
                    label={origem.name}
                    icon={origem.icon}
                    size="small"
                    outlined={attachmentSource !== origem.id}
                    className="nodrag flex-1"
                    onClick={() => atualizar({ attachmentSource: origem.id })}
                  />
                ))}
              </div>
            </div>

            {attachmentSource === 'upload' ? (
              <div className="flex flex-column gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={(e) => onArquivoSelecionado(e.target.files?.[0])}
                />
                <Button
                  label={nodeData.attachmentFileName ?? 'Anexar'}
                  icon={PrimeIcons.PAPERCLIP}
                  outlined
                  size="small"
                  className="nodrag w-full"
                  loading={enviando}
                  onClick={abrirSeletorDeArquivo}
                />
                {enviando && (
                  <ProgressBar
                    mode="indeterminate"
                    style={{ height: '4px' }}
                  />
                )}
              </div>
            ) : (
              <div>
                <LabelPlus
                  text="Variável do anexo"
                  textHelp="URL, data URI ou base64 vinda de um nó anterior. Ex.: {{ api_1.data.url }}"
                />
                <InputText
                  className="nodrag w-full"
                  value={nodeData.attachmentVariable ?? ''}
                  onChange={(e) => atualizar({ attachmentVariable: e.target.value })}
                  placeholder="{{ api_1.data.url }}"
                />
              </div>
            )}
          </>
        )}

        <div>
          <LabelPlus text={ehMidia ? 'Legenda' : 'Mensagem'} />
          <InputTextarea
            className="nodrag w-full"
            value={nodeData.value ?? ''}
            onChange={(e) => atualizar({ value: e.target.value })}
            rows={3}
            autoResize
            placeholder={ehMidia ? 'Legenda (opcional)' : 'Olá! Como posso ajudar?'}
          />
        </div>

        <div>
          <LabelPlus text="Continuar" />
          <Dropdown
            className="nodrag w-full"
            value={continueOn}
            onChange={(e) => atualizar({ continueOn: e.value })}
            options={CONTINUAR}
            optionLabel="name"
            optionValue="id"
          />
        </div>
      </div>

      
    </div>
  );
}

export default MessageNode;
