'use client';

import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { classNames } from 'primereact/utils';
import { ChangeEvent, useEffect, useState } from 'react';

import Avatar from '@/components/Avatar';
import { ContactResponse, SignatureResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

type EditorAvatarContatoProps = {
  contato?: ContactResponse | null;
  disabled?: boolean;
  /** Chamado sempre que o avatar muda (upload concluído ou removido) - quem
   * usa decide se inclui no próprio submit (upload) ou já persistiu sozinho
   * (remoção, que fala com a API na hora para poder oferecer "buscar do
   * WhatsApp"). */
  onChange: (dados: { avatarKey: string | null; changedAvatar: boolean }) => void;
  /** Só a remoção fala com a API por conta própria (por causa da pergunta
   * "buscar do WhatsApp?", que precisa do contato já salvo) - por isso
   * exige um id. Sem ele (contato ainda não criado), o botão de remover
   * apenas limpa o que foi selecionado nesta sessão do formulário. */
  onContatoAtualizado?: (contato: ContactResponse) => void;
};

type EstadoAvatar = {
  displayUrl: string | null;
  key: string | null;
  changed: boolean;
  file: File | null;
  isLoading: boolean;
};

/**
 * Upload de foto manual do contato, mesmo padrão do avatar de atendente
 * (`ModalFormUser.tsx`): preview local, upload assinado direto pro bucket,
 * key é o que persiste.
 *
 * Diferença central: remover aqui não é "limpar e pronto" - o contato pode
 * voltar a ter a foto do WhatsApp, então a remoção pergunta antes de decidir,
 * e por isso fala com a API na hora (`BuscarFotoWhatsappContato`), em vez de
 * só marcar estado local como os outros campos do formulário.
 */
function EditorAvatarContato({
  contato,
  disabled,
  onChange,
  onContatoAtualizado,
}: EditorAvatarContatoProps) {
  const { FetchReq } = useApi();
  const [avatar, setAvatar] = useState<EstadoAvatar>({
    displayUrl: null,
    key: null,
    changed: false,
    file: null,
    isLoading: false,
  });
  const [pointerOver, setPointerOver] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  // A key pode estar gravada sem o arquivo existir de fato no bucket (ex.:
  // upload que falhou depois de já ter marcado `avatar_is_manual`) - nesse
  // caso `Avatar` cai no placeholder padrão, e não faz sentido oferecer
  // "remover" uma foto que visualmente não está lá.
  const [imagemFalhou, setImagemFalhou] = useState(false);

  useEffect(() => {
    setAvatar({
      displayUrl: contato?.avatar_url || null,
      key: null,
      changed: false,
      file: null,
      isLoading: false,
    });
    setImagemFalhou(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contato?.id, contato?.avatar_url]);

  const podeRemover = contato?.avatar_is_manual && !!avatar.displayUrl && !imagemFalhou;
  const mostraRemover = !disabled && podeRemover && pointerOver && !avatar.isLoading;

  const abrirSeletor = () => {
    if (disabled) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg, image/png, image/webp, image/avif, image/apng';
    input.onchange = (event) => onSelecionarArquivo(event as unknown as ChangeEvent<HTMLInputElement>);
    input.click();
  };

  const onSelecionarArquivo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const limite = 2 * 1024 * 1024;
    if (file.size > limite) {
      CatchAlerta({ message: 'O arquivo deve ter no máximo 2MB' }, 'Não foi possível enviar a foto');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatar((prev) => ({ ...prev, displayUrl: previewUrl, file, isLoading: true }));

    // Sem contato ainda (cadastro novo): a assinatura exige um id existente.
    // O upload real acontece só depois que o contato for criado - por ora,
    // fica só o preview local, e quem chama decide o que fazer com `file`.
    if (!contato?.id) {
      setAvatar((prev) => ({ ...prev, changed: true, isLoading: false }));
      onChange({ avatarKey: null, changedAvatar: false });
      return;
    }

    try {
      setEnviando(true);

      const assinatura = await FetchReq<SignatureResponse>({
        endpoint: 'AssinarAvatarContato',
        variables: [contato.id],
        body: { fileType: file.type },
      });

      const resposta = await fetch(assinatura.url, {
        method: 'PUT',
        headers: assinatura.headers,
        body: file,
      });

      if (!resposta.ok) throw new Error(resposta.statusText || 'Erro ao enviar a foto');

      setAvatar((prev) => ({ ...prev, key: assinatura.key, changed: true, isLoading: false }));
      onChange({ avatarKey: assinatura.key, changedAvatar: true });
    } catch (err) {
      CatchAlerta(err, 'Não foi possível enviar a foto');
      setAvatar((prev) => ({
        ...prev,
        displayUrl: contato?.avatar_url || null,
        isLoading: false,
      }));
    } finally {
      setEnviando(false);
    }
  };

  /** Remove a foto manual - `buscarDoWhatsapp` decide se, no lugar de
   * deixar vazio, já busca a foto de perfil do WhatsApp na hora. */
  const remover = async (buscarDoWhatsapp: boolean) => {
    try {
      setRemovendo(true);
      setConfirmandoRemocao(false);

      const atualizado = await FetchReq<ContactResponse>(
        buscarDoWhatsapp
          ? { endpoint: 'BuscarFotoWhatsappContato', variables: [contato.id] }
          : { endpoint: 'AtualizarContato', variables: [contato.id], body: { avatar_url: null } },
      );

      setAvatar({
        displayUrl: atualizado?.avatar_url || null,
        key: null,
        changed: false,
        file: null,
        isLoading: false,
      });
      onContatoAtualizado?.(atualizado);
    } catch (err) {
      CatchAlerta(
        err,
        buscarDoWhatsapp ? 'Não foi possível buscar a foto do WhatsApp' : 'Não foi possível remover a foto',
      );
    } finally {
      setRemovendo(false);
    }
  };

  const onRemover = () => {
    if (contato?.id) setConfirmandoRemocao(true);
  };

  return (
    <div className="flex flex-column align-items-center">
      <div className="relative">
        <div
          className="w-8rem h-8rem border-circle relative border-1 border-400 surface-border overflow-hidden flex justify-content-center align-items-center"
          onMouseOver={() => setPointerOver(true)}
          onMouseOut={() => setPointerOver(false)}
        >
          <Avatar
            src={avatar.displayUrl}
            alt="Foto do contato"
            fill
            style={{ objectFit: 'cover' }}
            sizes="128"
            onError={() => setImagemFalhou(true)}
          />
          {(avatar.isLoading || enviando || removendo) && (
            <ProgressSpinner className="w-3rem absolute" />
          )}
          <Button
            className={classNames(
              { 'opacity-0 cursor-auto pointer-events-none': !mostraRemover, 'opacity-100': mostraRemover },
              'btnRemoveAvatar absolute top-0 left-0 w-full h-full text-2xl transition-all transition-duration-300',
            )}
            icon="pi pi-times"
            text
            rounded
            severity="danger"
            pt={{ icon: { className: 'text-3xl' } }}
            onClick={onRemover}
          />
        </div>
        {!disabled && (
          <Button
            className="absolute bottom-0 right-0 border-circle p-2 z-5 shadow-none"
            icon="pi pi-camera"
            severity="secondary"
            rounded
            onClick={abrirSeletor}
          />
        )}
      </div>

      {disabled && !contato?.id && (
        <small className="text-500 text-center block mt-2">
          Salve o contato para poder definir uma foto.
        </small>
      )}

      <Modal
        header="Remover foto"
        visible={confirmandoRemocao}
        onHide={() => setConfirmandoRemocao(false)}
        style={{ width: '28rem' }}
      >
        <p className="mt-0">
          Quer buscar a foto do contato no WhatsApp agora, no lugar da foto atual?
        </p>
        <div className="flex justify-content-between gap-2">
          <Button
            label="Só remover"
            severity="danger"
            outlined
            onClick={() => remover(false)}
          />
          <Button
            label="Buscar do WhatsApp"
            onClick={() => remover(true)}
          />
        </div>
      </Modal>
    </div>
  );
}

export default EditorAvatarContato;
