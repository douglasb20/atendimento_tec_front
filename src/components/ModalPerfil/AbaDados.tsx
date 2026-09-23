'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';

import Avatar from '@/components/Avatar';
import { usePermissoes } from '@/hooks/usePermissoes';
import { IUsuariosResponse, SignatureResponse } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { Alerta, CatchAlerta, getFormErrorMessage, msgRequired, ValidaEmail } from '@/service/Util';

type PerfilForm = {
  name: string;
  last_name?: string;
  email: string;
  senha?: string;
  confirma_senha?: string;
};

const schema = yup.object({
  name: yup.string().required(msgRequired),
  last_name: yup.string().nullable(),
  email: yup
    .string()
    .required(msgRequired)
    .test('email-validation', 'Email com formato inválido', (val) => ValidaEmail(val)),
  // Em branco significa "não trocar": exigir a senha a cada edição do nome
  // faria a pessoa digitá-la para mudar o sobrenome.
  senha: yup.string().nullable(),
  confirma_senha: yup
    .string()
    .nullable()
    .oneOf([yup.ref('senha'), null, ''], 'As senhas não conferem'),
});

type Props = {
  perfil: IUsuariosResponse;
  onSalvo: () => void;
};

/**
 * Os dados do próprio cadastro.
 *
 * ⚠️ **Sem grupo de permissão**, ao contrário do modal de usuários: mexer no
 * próprio papel é ato administrativo, e quem puder fazê-lo usa o módulo de
 * Usuários. Era a distinção que obrigava o formulário compartilhado a
 * desabilitar campo por campo conforme quem editava quem.
 */
const AbaDados = ({ perfil, onSalvo }: Props) => {
  const { FetchReq } = useApi();
  const { pode, ehSuperusuario } = usePermissoes();

  const podeSalvar = pode('user:profile_update');
  // O e-mail identifica a pessoa no login; trocá-lo pode exigir permissão
  // própria. O backend valida de novo - aqui é só para não oferecer o que
  // seria recusado.
  const bloqueiaEmail = !ehSuperusuario && !pode('user:change_own_email');

  const [salvando, setSalvando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(perfil.avatar_url ?? null);
  const [removeu, setRemoveu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, reset } = useForm<PerfilForm>({
    defaultValues: {
      name: perfil.name ?? '',
      last_name: perfil.last_name ?? '',
      email: perfil.email ?? '',
      senha: '',
      confirma_senha: '',
    },
    resolver: yupResolver(schema) as never,
  });

  useEffect(() => {
    reset({
      name: perfil.name ?? '',
      last_name: perfil.last_name ?? '',
      email: perfil.email ?? '',
      senha: '',
      confirma_senha: '',
    });
    setPrevia(perfil.avatar_url ?? null);
    setArquivo(null);
    setRemoveu(false);
  }, [perfil, reset]);

  const aoEscolherArquivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const escolhido = evento.target.files?.[0];
    evento.target.value = '';

    if (!escolhido) return;

    setArquivo(escolhido);
    setRemoveu(false);
    setPrevia(URL.createObjectURL(escolhido));
  };

  /** Sobe o avatar e devolve a key; `undefined` quando não houve troca. */
  const subirAvatar = async (): Promise<string | null | undefined> => {
    if (removeu && !arquivo) return null;
    if (!arquivo) return undefined;

    const assinatura = await FetchReq<SignatureResponse>({
      endpoint: 'AssinarAvatarUsuario',
      body: { user_id: perfil.id, key: 'user/avatar', fileType: arquivo.type },
    });

    // PUT com o arquivo cru: o Backblaze não aceita o POST-policy do S3.
    const resposta = await fetch(assinatura.url, {
      method: 'PUT',
      headers: assinatura.headers,
      body: arquivo,
    });

    if (!resposta.ok) throw new Error(resposta.statusText || 'Erro ao enviar a imagem');

    return assinatura.key;
  };

  const salvar = async (campos: PerfilForm) => {
    try {
      setSalvando(true);

      const avatarKey = await subirAvatar();

      const corpo: Record<string, unknown> = {
        name: campos.name,
        last_name: campos.last_name?.trim() || null,
        email: campos.email,
      };

      // Só manda o avatar quando mudou: `changed_avatar` é o que diz ao
      // backend para tocar na coluna.
      if (avatarKey !== undefined) {
        corpo.avatar_url = avatarKey;
        corpo.changed_avatar = true;
      }

      if (campos.senha) corpo.password = campos.senha;

      await FetchReq({ endpoint: 'AtualizarMeuPerfil', body: corpo });

      Alerta('Dados atualizados', '', 'success');
      onSalvo();
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível salvar');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="p-fluid">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={aoEscolherArquivo}
      />

      <div className="flex justify-content-center mb-4">
        <div className="relative">
          <div className="w-8rem h-8rem border-circle border-1 surface-border overflow-hidden relative flex align-items-center justify-content-center">
            <Avatar
              src={removeu ? null : previa}
              alt="Sua foto"
              width={128}
              height={128}
              style={{ objectFit: 'cover' }}
            />
          </div>

          <Button
            type="button"
            className="absolute bottom-0 right-0 border-circle p-2 shadow-none"
            icon="pi pi-camera"
            severity="secondary"
            rounded
            disabled={!podeSalvar}
            onClick={() => inputRef.current?.click()}
          />

          {(previa || arquivo) && !removeu && (
            <Button
              type="button"
              className="absolute bottom-0 left-0 border-circle p-2 shadow-none"
              icon="pi pi-times"
              severity="danger"
              rounded
              disabled={!podeSalvar}
              onClick={() => {
                setRemoveu(true);
                setArquivo(null);
                setPrevia(null);
              }}
            />
          )}
        </div>
      </div>

      <div className="grid">
        <div className="col-12 md:col-6">
          <label htmlFor="name">Nome</label>
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <InputText
                  id={field.name}
                  {...field}
                  disabled={!podeSalvar}
                  className={classNames({ 'p-invalid': fieldState.error })}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="col-12 md:col-6">
          <label htmlFor="last_name">Sobrenome</label>
          <Controller
            name="last_name"
            control={control}
            render={({ field }) => (
              <InputText
                id={field.name}
                {...field}
                value={field.value ?? ''}
                disabled={!podeSalvar}
              />
            )}
          />
        </div>

        <div className="col-12">
          <label htmlFor="email">E-mail</label>
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <InputText
                  id={field.name}
                  {...field}
                  disabled={!podeSalvar || bloqueiaEmail}
                  className={classNames({ 'p-invalid': fieldState.error })}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
          {bloqueiaEmail && (
            <small className="text-color-secondary">
              Peça a um administrador para alterar seu e-mail.
            </small>
          )}
        </div>

        <div className="col-12 md:col-6">
          <label htmlFor="senha">Nova senha</label>
          <Controller
            name="senha"
            control={control}
            render={({ field }) => (
              <InputText
                id={field.name}
                type="password"
                autoComplete="new-password"
                {...field}
                value={field.value ?? ''}
                disabled={!podeSalvar}
                placeholder="Deixe em branco para manter"
              />
            )}
          />
        </div>

        <div className="col-12 md:col-6">
          <label htmlFor="confirma_senha">Confirmar senha</label>
          <Controller
            name="confirma_senha"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <InputText
                  id={field.name}
                  type="password"
                  autoComplete="new-password"
                  {...field}
                  value={field.value ?? ''}
                  disabled={!podeSalvar}
                  className={classNames({ 'p-invalid': fieldState.error })}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>
      </div>

      <div className="flex justify-content-end mt-3">
        <Button
          label="Salvar"
          icon="fa-regular fa-check"
          loading={salvando}
          disabled={!podeSalvar}
          onClick={() => handleSubmit(salvar)()}
          style={{ width: 'auto' }}
        />
      </div>
    </div>
  );
};

export default AbaDados;
