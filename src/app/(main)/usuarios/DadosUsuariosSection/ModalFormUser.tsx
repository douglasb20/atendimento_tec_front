import { ChangeEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { classNames } from 'primereact/utils';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { parseCookies } from 'nookies';
import * as yup from 'yup';

import { getUserInfo } from '@/actions/userInfo';
import { IUsuariosResponse, Shape, SignatureResponse, UserInfo } from '@/Interfaces';
import { useService } from '@/contexts/ServicesContext';
import { AlertaCallback, CatchAlerta, getFormErrorMessage, msgRequired } from '@/service/Util';
import ApiClient from '@/service/Api/ApiClient';

import LabelPlus from '@/components/LabelPlus';
import InputDecimal from '@/components/InputDecimal';

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: IUsuariosResponse;
  onConfirm: () => void;
};

type UsuarioForm = Omit<IUsuariosResponse, 'is_requestpassword' | 'lastlogin_at' | 'created_at'> & {
  senha?: string;
  confirma_senha?: string;
};

const defaultForm: UsuarioForm = {
  name: '',
  email: '',
  valor_hora: 0.0,
  senha: '',
  confirma_senha: '',
  avatar_url: null,
};

type AvatarConfig = {
  displayUrl: string | null; // URL para exibir (presigned ou objectURL)
  key: string | null; // chave do bucket (o que vai ao banco)
  isChanged: boolean;
  file: File | null;
  removed?: boolean; // marca remoção explícita
  isLoading: boolean;
};

function extractKeyFromAvatar(avatar?: string | null): string | null {
  if (!avatar) return null;
  if (!/^https?:\/\//i.test(avatar)) return avatar; // já é a key

  try {
    const u = new URL(avatar);
    const host = u.hostname.toLowerCase();
    let path = decodeURIComponent(u.pathname.replace(/^\/+/, '')); // ex.: "bucket/user/avatar/file.jpg" ou "user/avatar/file.jpg"
    if (!path) return null;

    // path-style → host começa com s3. (s3.us-..., s3-..., s3.amazonaws.com, s3.wasabisys.com etc.)
    const isPathStyle =
      host === 's3.amazonaws.com' || host.startsWith('s3.') || host.startsWith('s3-');

    if (isPathStyle) {
      const slash = path.indexOf('/');
      if (slash !== -1) path = path.slice(slash + 1); // remove "bucket/"
    }

    return path; // "user/avatar/arquivo.jpg"
  } catch {
    return avatar;
  }
}

const ModalFormUser = (props: ModalProps) => {
  const { visible, onHide, data, onConfirm } = props;
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>({
    displayUrl: null,
    key: null,
    isChanged: false,
    file: null,
    removed: true,
    isLoading: true,
  });
  const [pointerOver, setPointerOver] = useState(false);
  const { FetchReq } = ApiClient();

  const schema = yup.object<yup.AnyObject, Shape<UsuarioForm>>({
    name: yup.string().required(msgRequired),
    email: yup.string().required(msgRequired).email('Email incorreto'),
    senha: yup.string().when('id', {
      is: () => data?.id === undefined,
      then: (schema) =>
        schema.required(msgRequired).min(4, 'Senha precisa ter mais de 4 caracteres'),
      otherwise: (schema) => schema.notRequired(),
    }),
    confirma_senha: yup
      .string()
      .oneOf([yup.ref('senha')], 'Senha não coincide')
      .when('senha', {
        is: () => data?.id === undefined,
        then: (schema) =>
          schema.required(msgRequired).min(4, 'Campo precisa ter no mínimo 4 caracteres'),
        otherwise: (schema) => schema.notRequired(),
      }),
  });

  const { control, handleSubmit, reset } = useForm<UsuarioForm>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });
  const { setLoading } = useService();

  const modalFooter = () => {
    return (
      <div className="flex justify-content-between">
        <Button
          label="Cancelar"
          severity="danger"
          outlined
          onClick={onHide}
        />
        <Button
          label="Salvar"
          onClick={() => handleSubmit(onSubmitForm)()}
        />
      </div>
    );
  };

  const onSubmitForm = async (fields: UsuarioForm) => {
    try {
      setLoading(true);
      // Base: se já existe algo, normaliza para key (mesmo que venha como presigned)
      let avatarKey = avatarConfig.key ?? extractKeyFromAvatar(data?.avatar_url);
      const cookies = parseCookies();
      const userInfo: UserInfo | null = cookies['userInfo']
        ? JSON.parse(cookies['userInfo'])
        : null;

      // Se marcou para remover e não selecionou novo arquivo
      if (avatarConfig.removed && !avatarConfig.file) {
        avatarKey = null;
      }

      if (avatarConfig.isChanged && avatarConfig.file) {
        const dataPostStorage = {
          user_id: data?.id,
          key: `user/avatar`,
          fileType: avatarConfig.file?.type,
        };

        const signedUrl = await FetchReq<SignatureResponse>({
          endpoint: 'AssinarAvatarUsuario',
          body: dataPostStorage,
        });

        const formData = new FormData();
        Object.entries(signedUrl.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
        formData.append('Content-Type', avatarConfig.file.type);
        formData.append('file', avatarConfig.file);

        const uploadResponse = await fetch(signedUrl.url, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(uploadResponse.statusText || 'Erro ao fazer upload do avatar');
        }

        avatarKey = signedUrl.fields.key;
      }

      const dataBody = {
        name: fields.name,
        email: fields.email,
        valor_hora: Number(fields.valor_hora).toFixed(2),
        avatar_url: avatarKey,
      };

      if (!data?.id) {
        dataBody['password'] = fields.senha;
        await FetchReq({
          endpoint: 'AdicionarUsuario',
          body: dataBody,
        });
      } else {
        if (fields.senha !== '') {
          dataBody['password'] = fields.senha;
        }
        await FetchReq({
          endpoint: 'AtualizarUsuario',
          body: dataBody,
          variables: [fields?.id],
        });
      }

      if (data?.id === userInfo?.id) {
        await getUserInfo();
      }

      AlertaCallback('Usuário salvo com sucesso!', () => onConfirm && onConfirm(), 'success');
      onHide && onHide();
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg, image/png, image/webp, image/avif, image/apng'; // pode ajustar para outros tipos
    fileInput.onchange = (event) => {
      onChangeAvatar(event as unknown as ChangeEvent<HTMLInputElement>);
    };
    fileInput.click();
  };

  const onChangeAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    const file = target.files?.[0];
    if (file) {
      const maxSize = 2 * 1024 * 1024; // 2MB em bytes
      if (file.size > maxSize) {
        alert('O arquivo deve ter no máximo 2MB');
        return;
      }
      const url = URL.createObjectURL(file);
      setAvatarConfig((prev) => ({
        ...prev,
        displayUrl: url, // mostra o preview
        key: prev.key, // key será definida após upload
        canRemove: true,
        isChanged: true,
        file,
        removed: false,
        isLoading: true,
      }));
      // Aqui você pode fazer upload ou processar o arquivo
    }
  };

  const onRemoveAvatar = () => {
    setAvatarConfig((prev) => ({
      ...prev,
      displayUrl: null,
      url: null,
      isChanged: true,
      file: null,
      removed: true,
    }));
  };

  const showRemoveButton = !avatarConfig.isLoading && !avatarConfig.removed && pointerOver;

  useEffect(() => {
    if (visible) {
      reset({
        ...defaultForm,
        ...data,
        ...(data?.valor_hora === null && { valor_hora: 0.0 }),
      });
      setAvatarConfig((prev) => ({
        ...prev,
        displayUrl: data?.avatar_url || null, // usar o que veio para exibir
        isChanged: false,
        removed: !data?.avatar_url,
        isLoading: true,
      }));
    }
  }, [visible]);
  return (
    <>
      <Modal
        modal
        className="p-fluid"
        style={{ width: '60rem' }}
        visible={visible}
        header={(!data?.id ? 'Adicionar' : 'Alterar') + ' usuário'}
        onHide={onHide}
        footer={modalFooter}
      >
        <div className="grid">
          <div className="col-12 flex justify-content-center ">
            <div className="relative">
              <div
                className="w-10rem h-10rem border-circle relative border-1 border-400 surface-border overflow-hidden flex justify-content-center align-items-center"
                onMouseOver={() => setPointerOver(true)}
                onMouseOut={() => setPointerOver(false)}
              >
                <Image
                  src={avatarConfig.displayUrl || '/images/avatar/avatar-noprofile.png'}
                  alt="Imagem de usuário"
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="200"
                  onLoad={() => setAvatarConfig((prev) => ({ ...prev, isLoading: false }))}
                />
                <ProgressSpinner
                  className={classNames(
                    {
                      hidden: !avatarConfig.isLoading,
                    },
                    'w-3rem',
                  )}
                />
                <Button
                  className={classNames(
                    {
                      'opacity-0 cursor-auto pointer-events-none': !showRemoveButton,
                      'opacity-100': showRemoveButton,
                    },
                    'btnRemoveAvatar absolute top-0 left-0 w-full h-full text-2xl transition-all transition-duration-300 ',
                  )}
                  icon="pi pi-times"
                  text
                  rounded
                  severity="danger"
                  pt={{
                    icon: {
                      className: 'text-4xl',
                    },
                  }}
                  onClick={onRemoveAvatar}
                />
              </div>
              <Button
                className="absolute bottom-0 right-0 border-circle p-2 z-5 shadow-none"
                icon="pi pi-camera"
                severity="secondary"
                rounded
                onClick={handleClick}
              />
            </div>
          </div>
          <div className="col-6">
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Nome"
                    required
                  />
                  <InputText
                    id={field.name}
                    {...field}
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-6">
            <Controller
              control={control}
              name="valor_hora"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Valor da hora"
                  />
                  <InputDecimal
                    id={field.name}
                    {...field}
                    value={field?.value?.toString()}
                    mode="decimal"
                    onChangeDecimal={field.onChange}
                    placeholder="Nome"
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-12">
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Email"
                    required
                  />
                  <InputText
                    id={field.name}
                    {...field}
                    placeholder="exemplo@exemplo.com"
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-6">
            <Controller
              control={control}
              name="senha"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Senha"
                    required={!data?.id}
                  />
                  <InputText
                    id={field.name}
                    {...field}
                    type="password"
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-6">
            <Controller
              control={control}
              name="confirma_senha"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Confirma senha"
                    required={!data?.id}
                  />
                  <InputText
                    id={field.name}
                    {...field}
                    type="password"
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ModalFormUser;
