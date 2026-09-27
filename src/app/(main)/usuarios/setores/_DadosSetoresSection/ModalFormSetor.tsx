import { yupResolver } from '@hookform/resolvers/yup';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { ColorPicker } from 'primereact/colorpicker';
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

export type FormSetor = { name: string; description: string; color: string };

type ModalProps = {
  visible: boolean;
  onHide: () => void;
  data: DepartmentResponse | null;
  onConfirm: (fields: FormSetor) => void;
};

// Mesmo valor padrão de `ModalFormTag`: evita o `ColorPicker` abrir em preto,
// que ninguém escolhe de propósito.
const defaultForm: FormSetor = { name: '', description: '', color: '#6366f1' };

const schema = yup.object<yup.AnyObject, Shape<FormSetor>>({
  name: yup.string().required(msgRequired).max(60, 'Máximo de 60 caracteres'),
  description: yup.string().max(255, 'Máximo de 255 caracteres'),
  color: yup.string().required(msgRequired),
});

/** Garante o `#` que o `ColorPicker` omite e o backend exige. */
const comCerquilha = (cor?: string) => {
  const limpa = (cor ?? '').replace('#', '');
  return limpa ? `#${limpa}` : '';
};

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
  const colorPickerRef = useRef<ColorPicker>(null);

  const { control, handleSubmit, reset } = useForm<FormSetor>({
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });

  useEffect(() => {
    if (visible) {
      setAbaAtiva(0);
      reset(
        data
          ? { name: data.name, description: data.description ?? '', color: data.color || defaultForm.color }
          : defaultForm,
      );
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
          onClick={() => handleSubmit((fields) => onConfirm({ ...fields, color: comCerquilha(fields.color) }))()}
        />
      </div>
    );
  };

  return (
    <Modal
      modal
      className="p-fluid"
      style={{ width: '48rem' }}
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
            <div className="flex align-items-start gap-3">
              <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                  <div className="flex-1">
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
                name="color"
                render={({ field, fieldState }) => (
                  <div style={{flex: '0 0 15rem'}}>
                    <LabelPlus
                      htmlFor={field.name}
                      text="Cor"
                      required
                    />
                    {/* Uma caixa só (o `InputText`), sem divisórias de
                        `p-inputgroup`: o conta-gotas e a bolinha são
                        posicionados por cima, absolutos. O conta-gotas é um
                        botão de verdade (abre o overlay via `show()` do
                        `ColorPicker`, que fica escondido ao lado, existindo só
                        para isso); a bolinha é decoração pura - mostra a cor
                        atual, sem `onClick` nem cursor de link. */}
                    <div className="relative">
                      <button
                        type="button"
                        className="absolute border-none bg-transparent cursor-pointer flex align-items-center justify-content-center p-0"
                        style={{ left: '0.5rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem' }}
                        disabled={somenteLeitura}
                        onClick={() => colorPickerRef.current?.show()}
                      >
                        <i className="pi pi-palette text-600" />
                      </button>

                      <InputText
                        id={field.name}
                        value={comCerquilha(field.value)}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="#RRGGBB"
                        disabled={somenteLeitura}
                        style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem' }}
                      />

                      <span
                        className="absolute border-circle pointer-events-none"
                        style={{
                          right: '0.6rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '1.5rem',
                          height: '1.5rem',
                          backgroundColor: comCerquilha(field.value) || 'transparent',
                        }}
                      />

                      {/* Sem input próprio visível: existe só para o overlay
                          nativo do `ColorPicker` abrir via ref. O
                          `alignOverlay` do componente usa o **pai do seu
                          input** (o `root` do próprio ColorPicker) como
                          referência - por isso é o `root`, não o `input`, que
                          precisa ficar ancorado no canto esquerdo deste
                          wrapper; sem isso ele fica no fluxo normal (depois da
                          bolinha) e o overlay abre deslocado. */}
                      <ColorPicker
                        ref={colorPickerRef}
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}
                        format="hex"
                        disabled={somenteLeitura}
                        appendTo="self"
                        pt={{
                          root: {
                            style: { position: 'absolute', left: 0, top: '100%', width: 0, height: 0 },
                          },
                          input: {
                            style: { border: 'none', padding: 0, width: 0, height: 0, opacity: 0 },
                          },
                        }}
                      />
                    </div>
                    {getFormErrorMessage(fieldState)}
                  </div>
                )}
              />
            </div>

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
            <div className="text-color-secondary p-2">Nenhum atendente cadastrado.</div>
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
