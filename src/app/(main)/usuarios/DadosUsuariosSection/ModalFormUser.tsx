import { ChangeEvent, useEffect, useState } from 'react';
import Avatar from '@/components/Avatar';
import { classNames } from 'primereact/utils';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { parseCookies } from 'nookies';
import * as yup from 'yup';

import { getUserInfo } from '@/actions/userInfo';
import { usePermissoes } from '@/hooks/usePermissoes';
import {
  IUsuariosResponse,
  PermissionGroupResponse,
  Shape,
  SignatureResponse,
  UserInfo,
} from '@/Interfaces';
import { useService } from '@/contexts/ServicesContext';
import { AlertaCallback, CatchAlerta, getFormErrorMessage, msgRequired } from '@/service/Util';
import ApiClient from '@/service/Api/ApiClient';

import LabelPlus from '@/components/LabelPlus';

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: IUsuariosResponse;
  onConfirm: () => void;
};

type UsuarioForm = Omit<IUsuariosResponse, 'is_requestpassword' | 'lastlogin_at' | 'created_at'> & {
  senha?: string;
  confirma_senha?: string;
  /** O grupo define o que o usuário pode fazer. Nulo é sem acesso a nada. */
  permission_group_id?: number | null;
};

const defaultForm: UsuarioForm = {
  name: '',
  last_name: '',
  email: '',
  senha: '',
  confirma_senha: '',
  avatar_url: null,
  permission_group_id: null,
};

/** Opção que representa "sem grupo" - o usuário entra mas não acessa nada. */
const SEM_GRUPO = { id: null as number | null, name: 'Sem grupo (nenhum acesso)' };

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
  const [grupos, setGrupos] = useState<PermissionGroupResponse[]>([]);
  const { FetchReq } = ApiClient();

  const schema = yup.object<yup.AnyObject, Shape<UsuarioForm>>({
    name: yup.string().required(msgRequired),
    last_name: yup.string().notRequired(),
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
          schema.required(msgRequired).min(6, 'Campo precisa ter no mínimo 6 caracteres'),
        otherwise: (schema) => schema.notRequired(),
      }),
  });

  const { control, handleSubmit, reset } = useForm<UsuarioForm>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });
  const { setLoading } = useService();
  const { pode } = usePermissoes();

  // ⚠️ Este modal é **só administrativo**. A auto-edição mudou de lugar: vive
  // em `components/ModalPerfil`, aberto pelo sidebar, com `user:profile_update`
  // e a rota `/users/meu-perfil`.
  //
  // Enquanto os dois casos dividiam este formulário, era preciso decidir campo
  // a campo quem podia mexer em quê - e daí as condicionais de e-mail e grupo
  // que viviam aqui. Separados, cada tela mostra o que lhe cabe.
  //
  // O backend continua validando: ele aceita a rota `/users/:id` para o próprio
  // id, e `recusaCamposSemPermissao` é quem barra. O front deixou de oferecer
  // o caminho, não de precisar da checagem.
  const podeSalvar = pode(data?.id ? 'user:update' : 'user:add');

  const modalFooter = () => {
    return (
      <div className="flex justify-content-between">
        <Button
          label="Cancelar"
          severity="danger"
          outlined
          onClick={onHide}
        />
        {/* Sem permissão de gravar, o botão fica desabilitado em vez de sumir:
            a pessoa ainda abre o cadastro para conferir os próprios dados. */}
        <Button
          label="Salvar"
          disabled={!podeSalvar}
          onClick={() => handleSubmit(onSubmitForm)()}
        />
      </div>
    );
  };

  const onSubmitForm = async (fields: UsuarioForm) => {
    try {
      setLoading(true);
      let changed_avatar = false;
      // Base: se já existe algo, normaliza para key (mesmo que venha como presigned)
      let avatarKey = avatarConfig.key ?? extractKeyFromAvatar(data?.avatar_url);
      const cookies = parseCookies();
      const userInfo: UserInfo | null = cookies['userInfo']
        ? JSON.parse(cookies['userInfo'])
        : null;

      // Se marcou para remover e não selecionou novo arquivo
      if (avatarConfig.removed && !avatarConfig.file) {
        avatarKey = null;
        changed_avatar = true;
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

        // PUT com o arquivo cru: o B2 não aceita o POST-policy do S3.
        const uploadResponse = await fetch(signedUrl.url, {
          method: 'PUT',
          headers: signedUrl.headers,
          body: avatarConfig.file,
        });

        if (!uploadResponse.ok) {
          throw new Error(uploadResponse.statusText || 'Erro ao fazer upload do avatar');
        }

        avatarKey = signedUrl.key;
        changed_avatar = true;
      }

      const dataBody = {
        name: fields.name,
        last_name: fields.last_name?.trim() || null,
        email: fields.email,
        avatar_url: avatarKey,
        changed_avatar,
        permission_group_id: fields.permission_group_id ?? null,
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

  // Carregados ao abrir: cadastrar um papel novo e não vê-lo aqui seria
  // confuso. Mesmo critério do campo de integração no cadastro de canal.
  useEffect(() => {
    if (!visible) return;

    const carregar = async () => {
      try {
        const dados = await FetchReq<PermissionGroupResponse[]>('ListarGruposPermissao');
        setGrupos(dados ?? []);
      } catch {
        // Sem `permission_group:view` a lista fica vazia e o campo some - o caso de quem
        // pode editar usuário mas não gerir papéis. Alertar seria ruído.
        setGrupos([]);
      }
    };

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (visible) {
      reset({
        ...defaultForm,
        ...data,
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
                <Avatar
                  src={avatarConfig.displayUrl}
                  alt="Imagem de usuário"
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="200"
                  onLoad={() => setAvatarConfig((prev) => ({ ...prev, isLoading: false }))}
                  onError={() => setAvatarConfig((prev) => ({ ...prev, isLoading: false }))}
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
          {/* Nome e sobrenome dividem a linha; o grupo, quando existe, fica na
              de baixo. Antes o nome dividia com o grupo. */}
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
                    disabled={!podeSalvar}
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>

          <div className="col-6">
            <Controller
              control={control}
              name="last_name"
              render={({ field, fieldState }) => (
                <>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Sobrenome"
                  />
                  <InputText
                    id={field.name}
                    {...field}
                    value={field?.value || ''}
                    disabled={!podeSalvar}
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          <div className="col-6">
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
                    disabled={!podeSalvar}
                  />
                  {getFormErrorMessage(fieldState)}
                </>
              )}
            />
          </div>
          {/* Só aparece quando há grupos para escolher: sem
              `permission_group:view` a lista volta vazia, e um campo
              desabilitado só ocuparia espaço. */}
          {grupos.length > 0 && (
            <div className="col-6">
              <Controller
                control={control}
                name="permission_group_id"
                render={({ field }) => (
                  <>
                    <LabelPlus
                      htmlFor={field.name}
                      text="Grupo de permissão"
                      textHelp="Define o que este usuário pode fazer no sistema. Sem grupo, ele entra mas não acessa nada."
                    />
                    <Dropdown
                      id={field.name}
                      {...field}
                      className="w-full"
                      // `SEM_GRUPO` na frente: o valor nulo é escolha legítima
                      // e precisa ser selecionável de volta depois de trocado.
                      options={[SEM_GRUPO, ...grupos]}
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Selecione o grupo"
                      // Sem `user:change_group` ninguém muda o próprio grupo -
                      // seria promover a si mesmo. O backend recusa com 401.
                      disabled={!podeSalvar}
                    />
                  </>
                )}
              />
            </div>
          )}
          
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
                    disabled={!podeSalvar}
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
                    disabled={!podeSalvar}
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
