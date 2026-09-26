'use client';

import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog as Modal } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { memo, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import LabelPlus from '@/components/LabelPlus';
import {
  PermissionGroupResponse,
  PermissionModuleResponse,
  PermissionResponse,
} from '@/Interfaces';
import { getFormErrorMessage, msgRequired } from '@/service/Util';
import { usePermissoesModulo } from '@/hooks/usePermissoesModulo';

export type FormGrupo = {
  name: string;
  description: string;
  permission_ids: number[];
};

type Props = {
  visible: boolean;
  data: PermissionGroupResponse | null;
  /** Criando a partir de um existente: o formulário vem preenchido, mas salva como novo. */
  clonando?: boolean;
  permissoes: PermissionResponse[];
  modulos: PermissionModuleResponse[];
  onHide: () => void;
  onConfirm: (fields: FormGrupo) => void;
};

const defaultValues: FormGrupo = { name: '', description: '', permission_ids: [] };

const ModalFormGrupo = ({
  visible,
  data,
  clonando,
  permissoes,
  modulos,
  onHide,
  onConfirm,
}: Props) => {
  const { podeAdicionar, podeEditar, semPermissao } = usePermissoesModulo('permission_group');

  // Editar exige `:update`; criar, `:add`. Sem a permissão do caso, o
  // formulário abre em somente leitura - quem tem `:view` consulta o cadastro.
  const somenteLeitura = data?.id ? !podeEditar : !podeAdicionar;

  const { control, handleSubmit, reset } = useForm<FormGrupo>({ defaultValues });
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());

  /** As permissões agrupadas pelo módulo a que pertencem. */
  const grupos = useMemo(() => {
    return (
      modulos
        .map((modulo) => ({
          modulo,
          itens: permissoes.filter((p) => p.permission_module_id === modulo.id),
        }))
        // Módulo sem permissão nenhuma não tem o que mostrar.
        .filter((g) => g.itens.length > 0)
    );
  }, [modulos, permissoes]);

  useEffect(() => {
    if (!visible) return;

    const ids = new Set((data?.permissions ?? []).map((p) => p.id));
    setSelecionadas(ids);
    reset({
      // Clonando, o nome vem sugerido com sufixo: o backend recusa repetido
      // com 409, e deixar o campo igual ao original garantiria o erro.
      name: data ? (clonando ? `${data.name} (cópia)` : data.name) : '',
      description: data?.description ?? '',
      permission_ids: Array.from(ids),
    });
  }, [visible, data, clonando]);

  const alterna = (id: number) => {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  /**
   * Marca ou desmarca todas as permissões de uma vez.
   *
   * Atalho dos dois extremos: um grupo de administrador quer tudo, e quem vai
   * montar um restrito prefere partir do zero a desmarcar 45 caixas.
   */
  const alternaTudo = (marcar: boolean) => {
    setSelecionadas(marcar ? new Set(permissoes.map((p) => p.id)) : new Set());
  };

  /** Marca ou desmarca o grupo inteiro - são 45 permissões em 12 módulos. */
  const alternaGrupo = (itens: PermissionResponse[], marcar: boolean) => {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      itens.forEach((p) => (marcar ? novo.add(p.id) : novo.delete(p.id)));
      return novo;
    });
  };

  const onSubmit = (fields: FormGrupo) => {
    // As permissões vêm do estado, não do formulário: o `react-hook-form` não
    // acompanha as caixas de seleção, que são dezenas e mudariam a cada clique.
    onConfirm({ ...fields, permission_ids: Array.from(selecionadas) });
  };

  return (
    <Modal
      resizable={false}
      header={
        clonando
          ? `Novo grupo a partir de "${data?.name}"`
          : data?.id
            ? 'Editar grupo de permissão'
            : 'Novo grupo de permissão'
      }
      visible={visible}
      className="w-11 md:w-9 lg:w-7"
      style={{ minWidth: '22rem' }}
      onHide={onHide}
      blockScroll
      closeOnEscape={false}
    >
      <div className="formgrid grid gap-3">
        {data?.is_system && !clonando && (
          <div className="col-12">
            <Message
              severity="info"
              className="w-full justify-content-start"
              text="Grupo do sistema: as permissões podem ser ajustadas, mas ele não pode ser excluído."
            />
          </div>
        )}

        <div className="col-12 p-fluid">
          <LabelPlus
            text="Nome do grupo"
            required
          />
          <Controller
            control={control}
            name="name"
            rules={{ required: msgRequired }}
            render={({ field, fieldState }) => (
              <>
                <InputText
                  {...field}
                  placeholder="Ex.: Supervisor"
                  disabled={somenteLeitura}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="col-12 p-fluid">
          <LabelPlus
            text="Descrição"
            textHelp="Uma linha explicando para quem é este grupo - ajuda na hora de escolher no cadastro do atendente."
          />
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <InputText
                {...field}
                placeholder="Ex.: Acompanha a operação sem mexer em atendentes"
                disabled={somenteLeitura}
              />
            )}
          />
        </div>

        <div className="col-12">
          <div className="flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <LabelPlus text="Permissões" />

            <div className="flex align-items-center gap-2">
              <span className="text-sm text-500">
                {selecionadas.size} de {permissoes.length} selecionadas
              </span>

              {/* `p-button-text`: são atalhos, não a ação principal do modal -
                  botões sólidos aqui competiriam com o Salvar. */}
              <Button
                type="button"
                label="Selecionar tudo"
                icon={PrimeIcons.CHECK}
                className="p-button-text p-button-sm"
                disabled={selecionadas.size === permissoes.length}
                onClick={() => alternaTudo(true)}
              />
              <Button
                type="button"
                label="Limpar"
                icon={PrimeIcons.TIMES}
                className="p-button-text p-button-sm p-button-secondary"
                disabled={selecionadas.size === 0}
                onClick={() => alternaTudo(false)}
              />
            </div>
          </div>

          {/* Altura limitada com rolagem própria: são 45 permissões, e sem isso
              os botões de salvar ficariam abaixo da dobra. */}
          <div
            className="border-1 border-300 border-round p-3 overflow-y-auto"
            style={{ maxHeight: '26rem' }}
          >
            {grupos.map(({ modulo, itens }) => {
              const marcadas = itens.filter((p) => selecionadas.has(p.id)).length;
              const todas = marcadas === itens.length;

              return (
                <div
                  key={modulo.id}
                  className="mb-3 pb-2 border-bottom-1 border-200"
                >
                  <div className="flex align-items-center gap-2 mb-2">
                    <Checkbox
                      inputId={`grupo-${modulo.id}`}
                      checked={todas}
                      // Parcialmente marcado precisa se distinguir de vazio:
                      // sem isto, um módulo com metade das permissões parece
                      // não ter nenhuma.
                      className={!todas && marcadas > 0 ? 'opacity-60' : undefined}
                      onChange={() => alternaGrupo(itens, !todas)}
                      disabled={somenteLeitura}
                    />
                    <label
                      htmlFor={`grupo-${modulo.id}`}
                      className="font-semibold cursor-pointer"
                    >
                      {modulo.nome}
                    </label>
                    <span className="text-xs text-500">
                      ({marcadas}/{itens.length})
                    </span>
                  </div>

                  <div className="grid pl-4">
                    {itens.map((permissao) => (
                      <div
                        key={permissao.id}
                        className="col-12 md:col-6 flex align-items-center gap-2 py-1"
                      >
                        <Checkbox
                          inputId={`perm-${permissao.id}`}
                          checked={selecionadas.has(permissao.id)}
                          onChange={() => alterna(permissao.id)}
                          disabled={somenteLeitura}
                        />
                        <label
                          htmlFor={`perm-${permissao.id}`}
                          className="text-sm cursor-pointer"
                          // O nome técnico no title: é o que aparece no código
                          // e nos logs, e some da tela para não poluir.
                          title={permissao.name}
                        >
                          {permissao.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-12 flex justify-content-end gap-2">
          <Button
            label="Cancelar"
            className="p-button-text"
            onClick={onHide}
          />
          <Button
            label="Salvar"
            disabled={somenteLeitura}
            title={somenteLeitura ? semPermissao : undefined}
            onClick={() => handleSubmit(onSubmit)()}
          />
        </div>
      </div>
    </Modal>
  );
};

export default memo(ModalFormGrupo);
