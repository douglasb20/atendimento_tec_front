'use client';

import { PrimeIcons } from 'primereact/api';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { useEffect, useState } from 'react';
import { Control, Controller, useFieldArray, useWatch } from 'react-hook-form';

import { CustomFieldResponse, ValorCampoForm } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { getFormErrorMessage } from '@/service/Util';

/**
 * Seção "Informações adicionais" dos formulários de contato e cliente.
 *
 * O catálogo diz quais campos **podem** ser usados; quem edita escolhe, linha
 * por linha, quais este registro terá. Cadastrar um campo não o faz aparecer
 * em ninguém - é justamente o contrário de um formulário fixo.
 *
 * ⚠️ O componente vive fora das telas porque contato e cliente usam o mesmo
 * comportamento: duplicá-lo faria as duas versões divergirem com o tempo.
 */
type CamposPersonalizadosProps = {
  control: Control<any>;
  /** Qual catálogo carregar. */
  aplicaA: 'contato' | 'cliente';
  /** O nome do campo no formulário; `campos` nos dois casos. */
  name?: string;
};

const CamposPersonalizados = ({ control, aplicaA, name = 'campos' }: CamposPersonalizadosProps) => {
  const { FetchReq } = useApi();
  const [catalogo, setCatalogo] = useState<CustomFieldResponse[]>([]);

  const { fields, append, remove, update } = useFieldArray({
    control,
    name,
    keyName: 'id_field',
  });

  // Observado para saber o que já foi escolhido: o `fields` do `useFieldArray`
  // é um retrato do append, e não acompanha a troca feita no Dropdown.
  const valores: ValorCampoForm[] = useWatch({ control, name }) ?? [];

  useEffect(() => {
    const carregar = async () => {
      try {
        const dados = await FetchReq<CustomFieldResponse[]>({
          endpoint: 'ListarCamposPorAplicacao',
          variables: [aplicaA],
        });
        setCatalogo(dados ?? []);
      } catch {
        // Sem catálogo a seção fica vazia e o resto do formulário funciona.
        // Alarmar aqui atrapalharia quem só quer salvar o nome do contato.
      }
    };

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplicaA]);

  /**
   * Os campos que ainda cabem nesta linha.
   *
   * O já escolhido em outra some: repetir o mesmo campo violaria a chave
   * composta do banco, e o erro chegaria como falha crua ao salvar.
   */
  const disponiveis = (indiceAtual: number) => {
    const usados = valores
      .map((v, i) => (i === indiceAtual ? null : v?.custom_field_id))
      .filter(Boolean);

    return catalogo.filter((c) => !usados.includes(c.id));
  };

  const campoDe = (id?: number | null) => catalogo.find((c) => c.id === id);

  if (!catalogo.length && !fields.length) {
    return (
      <div className="border-1 border-300 border-round p-3 text-center text-600">
        <i className={`${PrimeIcons.INFO_CIRCLE} mr-2`} />
        Nenhum campo personalizado cadastrado. Configurações → Campos personalizados.
      </div>
    );
  }

  return (
    <div className="border-1 border-300 border-round overflow-hidden">
      {/* Cabeçalho com fundo próprio: separa a seção do resto do formulário
          sem precisar de um título solto acima dela. */}
      <div className="flex align-items-center justify-content-between px-3 py-2 surface-50 border-bottom-1 border-300">
        <span className="flex align-items-center gap-2">
          <span
            className="font-semibold text-700 text-sm white-space-nowrap"
            style={{ letterSpacing: '0.03em' }}
          >
            INFORMAÇÕES ADICIONAIS
          </span>
          <Badge
            value={fields.length}
            severity={fields.length ? 'info' : null}
          />
        </span>

        <Button
          type="button"
          label="Adicionar campo"
          icon={PrimeIcons.PLUS}
          className="p-button-sm p-button-rounded flex-none"
          // O modal está dentro de um `p-fluid`, e o tema tem
          // `.p-fluid .p-button { width: 100% }`: sem isto o botão esticava
          // pela largura toda e engolia o cabeçalho.
          style={{ width: 'auto' }}
          // Desabilitado quando todos os campos do catálogo já estão na tela:
          // o seletor da linha nova não teria o que oferecer.
          disabled={fields.length >= catalogo.length}
          onClick={() => append({ custom_field_id: null, valor: '' })}
        />
      </div>

      <div className="p-3">
        {!fields.length && (
          <div className="flex flex-column align-items-center justify-content-center gap-2 py-4 text-600">
            <i className={`${PrimeIcons.LIST} text-3xl text-400`} />
            <span>Nenhuma informação adicional ainda.</span>
          </div>
        )}

        {fields.map((linha, indice) => {
          const campo = campoDe(valores[indice]?.custom_field_id);

          return (
            <div
              key={linha.id_field}
              className="grid align-items-start mb-2"
            >
              <div className="col-12 md:col-5">
                <Controller
                  control={control}
                  name={`${name}.${indice}.custom_field_id`}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        {...field}
                        options={disponiveis(indice)}
                        optionLabel="nome"
                        optionValue="id"
                        placeholder="Escolha o campo"
                        className="w-full"
                        onChange={(e) => {
                          // Trocar o campo limpa o valor: "Indicação" não serve
                          // como data, e manter o texto deixaria o formulário
                          // com um valor inválido para o tipo novo.
                          field.onChange(e.value);
                          update(indice, { custom_field_id: e.value, valor: '' });
                        }}
                      />
                      {getFormErrorMessage(fieldState)}
                    </>
                  )}
                />
              </div>

              <div className="col-10 md:col-6">
                <Controller
                  control={control}
                  name={`${name}.${indice}.valor`}
                  render={({ field, fieldState }) => (
                    <>
                      <EditorDoValor
                        campo={campo}
                        value={field.value}
                        onChange={field.onChange}
                      />
                      {getFormErrorMessage(fieldState)}
                    </>
                  )}
                />
              </div>

              <div className="col-2 md:col-1 flex justify-content-center">
                <Button
                  type="button"
                  icon={PrimeIcons.TRASH}
                  className="p-button-text p-button-danger"
                  tooltip="Remover este campo"
                  tooltipOptions={{ position: 'left' }}
                  onClick={() => remove(indice)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * O editor certo para o tipo declarado no catálogo.
 *
 * Tudo trafega como texto - é o que a API recebe e o que o banco guarda -, mas
 * o que se vê é um calendário, um número ou uma lista, conforme o campo.
 */
const EditorDoValor = ({
  campo,
  value,
  onChange,
}: {
  campo?: CustomFieldResponse;
  value: string;
  onChange: (valor: string) => void;
}) => {
  // Enquanto nenhum campo foi escolhido não há tipo para decidir o editor.
  if (!campo) {
    return (
      <InputText
        value=""
        disabled
        placeholder="Escolha o campo primeiro"
        className="w-full"
      />
    );
  }

  switch (campo.tipo) {
    case 'numero':
      return (
        <InputNumber
          value={value ? Number(value) : null}
          onValueChange={(e) => onChange(e.value != null ? String(e.value) : '')}
          className="w-full"
          placeholder="Número"
        />
      );

    case 'data':
      return (
        <Calendar
          // O valor viaja em ISO (`AAAA-MM-DD`); o `Calendar` trabalha com
          // `Date`, e a conversão acontece nas duas pontas.
          value={value ? new Date(`${value}T00:00:00`) : null}
          onChange={(e) =>
            onChange(e.value instanceof Date ? e.value.toISOString().slice(0, 10) : '')
          }
          dateFormat="dd/mm/yy"
          showIcon
          className="w-full"
          placeholder="dd/mm/aaaa"
        />
      );

    case 'booleano':
      return (
        <Dropdown
          value={value || null}
          options={[
            { label: 'Sim', value: 'true' },
            { label: 'Não', value: 'false' },
          ]}
          onChange={(e) => onChange(e.value ?? '')}
          placeholder="Sim ou não"
          className="w-full"
        />
      );

    case 'lista':
      return (
        <Dropdown
          value={value || null}
          options={(campo.opcoes ?? []).map((o) => ({ label: o, value: o }))}
          onChange={(e) => onChange(e.value ?? '')}
          placeholder="Escolha uma opção"
          className="w-full"
        />
      );

    default:
      return (
        <InputText
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full"
          placeholder={campo.nome}
        />
      );
  }
};

export default CamposPersonalizados;
