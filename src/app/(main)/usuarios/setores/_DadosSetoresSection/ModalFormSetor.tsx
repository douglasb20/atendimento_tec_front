import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { TabPanel, TabView } from 'primereact/tabview';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import LabelPlus from '@/components/LabelPlus';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';
import { DepartmentResponse, MembroSetorResponse, Shape } from '@/Interfaces';
import ApiClient from '@/service/Api/ApiClient';
import { AlertaCallback, CatchAlerta, getFormErrorMessage, msgRequired } from '@/service/Util';

import HorarioSetorTab, { HorarioSetorTabHandle } from './HorarioSetorTab';

export type FormSetor = { name: string; description: string };

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: DepartmentResponse | null;
  onConfirm: (fields: FormSetor) => void;
};

const defaultForm: FormSetor = { name: '', description: '' };

const schema = yup.object<yup.AnyObject, Shape<FormSetor>>({
  name: yup.string().required(msgRequired).max(60, 'Máximo de 60 caracteres'),
  description: yup.string().max(255, 'Máximo de 255 caracteres'),
});

function ModalFormSetor({ visible, onHide, data, onConfirm }: ModalProps) {
  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('department');
  const { FetchReq } = ApiClient();

  // Editar exige `:update`; criar, `:add`. Sem a do caso, o formulário abre em
  // somente leitura - quem tem `:view` consulta o cadastro.
  const somenteLeitura = data?.id ? !podeEditar : !podeAdicionar;

  const [abaAtiva, setAbaAtiva] = useState(0);
  const [membros, setMembros] = useState<MembroSetorResponse[]>([]);
  const [membrosCarregando, setMembrosCarregando] = useState(false);
  const [membrosSalvando, setMembrosSalvando] = useState(false);
  const [horarioSalvando, setHorarioSalvando] = useState(false);
  const horarioTabRef = useRef<HorarioSetorTabHandle>(null);

  const { control, handleSubmit, reset } = useForm<FormSetor>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  useEffect(() => {
    if (visible) {
      setAbaAtiva(0);
      reset(data ? { name: data.name, description: data.description ?? '' } : defaultForm);
    }
  }, [visible, data, reset]);

  // A equipe só existe para setor já criado - um setor novo ainda não tem
  // linha em `user_x_department` para carregar.
  useEffect(() => {
    if (!visible || !data?.id) {
      setMembros([]);
      return;
    }

    const carregar = async () => {
      try {
        setMembrosCarregando(true);
        const dados = await FetchReq<MembroSetorResponse[]>({
          endpoint: 'ListarMembrosSetor',
          variables: [data.id],
        });
        setMembros(dados ?? []);
      } catch {
        setMembros([]);
      } finally {
        setMembrosCarregando(false);
      }
    };

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, data?.id]);

  const alternarMembro = (userId: number, marcado: boolean) => {
    setMembros((prev) =>
      prev.map((usuario) => (usuario.id === userId ? { ...usuario, membro: marcado } : usuario)),
    );
  };

  const salvarMembros = async () => {
    try {
      setMembrosSalvando(true);
      const user_ids = membros.filter((usuario) => usuario.membro).map((usuario) => usuario.id);
      await FetchReq({
        endpoint: 'AtualizarMembrosSetor',
        variables: [data.id],
        body: { user_ids },
      });
      AlertaCallback('Equipe atualizada com sucesso!', () => {}, 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar a equipe do setor');
    } finally {
      setMembrosSalvando(false);
    }
  };

  const modalFooter = () => {
    // Rodapé próprio por aba: "Dados do setor" salva pelo formulário e fecha o
    // modal; "Equipe" e "Horário" gravam só o próprio recurso, sem fechar -
    // são gravações independentes, como o cadastro de canal faz com conexão e
    // setores.
    if (abaAtiva === 1) {
      return (
        <div className="flex justify-content-between">
          <Button
            label="Fechar"
            severity="danger"
            outlined
            onClick={onHide}
          />
          <Button
            label="Salvar equipe"
            loading={membrosSalvando}
            disabled={somenteLeitura}
            title={somenteLeitura ? semPermissao : undefined}
            onClick={salvarMembros}
          />
        </div>
      );
    }

    if (abaAtiva === 2) {
      return (
        <div className="flex justify-content-between">
          <Button
            label="Fechar"
            severity="danger"
            outlined
            onClick={onHide}
          />
          <Button
            label="Salvar horário"
            loading={horarioSalvando}
            disabled={somenteLeitura}
            title={somenteLeitura ? semPermissao : undefined}
            onClick={() => horarioTabRef.current?.salvar()}
          />
        </div>
      );
    }

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
          disabled={somenteLeitura}
          title={somenteLeitura ? semPermissao : undefined}
          onClick={() => handleSubmit(onConfirm)()}
        />
      </div>
    );
  };

  return (
    <Modal
      modal
      className="p-fluid"
      style={{ width: '45rem' }}
      breakpoints={{ '640px': '95vw' }}
      visible={visible}
      header={!data?.id ? 'Novo setor' : 'Alterar setor'}
      onHide={onHide}
      footer={modalFooter}
    >
      <TabView
        activeIndex={abaAtiva}
        onTabChange={(e) => setAbaAtiva(e.index)}
      >
        <TabPanel
          header="Dados do setor"
          leftIcon="fa-regular fa-sitemap mr-2"
        >
          <div className="flex flex-column gap-4">
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <div>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Nome"
                    required
                  />
                  <InputText
                    id={field.name}
                    {...field}
                    value={field?.value || ''}
                    placeholder="Suporte, Financeiro, Comercial…"
                    autoFocus
                    disabled={somenteLeitura}
                  />
                  {getFormErrorMessage(fieldState)}
                </div>
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <div>
                  <LabelPlus
                    htmlFor={field.name}
                    text="Descrição"
                  />
                  <InputTextarea
                    id={field.name}
                    {...field}
                    value={field?.value || ''}
                    rows={3}
                    autoResize
                    placeholder="O que este setor atende"
                    disabled={somenteLeitura}
                  />
                  {getFormErrorMessage(fieldState)}
                </div>
              )}
            />
          </div>
        </TabPanel>

        <TabPanel
          header="Equipe"
          leftIcon="fa-regular fa-users mr-2"
          disabled={!data?.id}
        >
          {membrosCarregando ? (
            <div className="flex justify-content-center p-4">
              <ProgressSpinner className="w-3rem" />
            </div>
          ) : membros.length === 0 ? (
            <div className="text-color-secondary p-2">Nenhum usuário cadastrado.</div>
          ) : (
            <div className="flex flex-column gap-3">
              {membros.map((usuario) => (
                <div
                  key={usuario.id}
                  className="flex align-items-center gap-2"
                >
                  <Checkbox
                    inputId={`membro-${usuario.id}`}
                    checked={usuario.membro}
                    disabled={somenteLeitura}
                    onChange={(e) => alternarMembro(usuario.id, !!e.checked)}
                  />
                  <label htmlFor={`membro-${usuario.id}`}>
                    {usuario.name} {usuario.last_name ?? ''}
                    <span className="text-color-secondary ml-2">{usuario.email}</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel
          header="Horário de atendimento"
          leftIcon="fa-regular fa-clock mr-2"
          disabled={!data?.id}
        >
          {data?.id && (
            <HorarioSetorTab
              ref={horarioTabRef}
              departmentId={data.id}
              ativa={visible && abaAtiva === 2}
              somenteLeitura={somenteLeitura}
              onSalvandoChange={setHorarioSalvando}
            />
          )}
        </TabPanel>
      </TabView>
    </Modal>
  );
}

export default ModalFormSetor;
