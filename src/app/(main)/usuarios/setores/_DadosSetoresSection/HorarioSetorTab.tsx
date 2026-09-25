import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputSwitch } from 'primereact/inputswitch';
import { PrimeIcons } from 'primereact/api';
import { ProgressSpinner } from 'primereact/progressspinner';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import EditorMensagem from '@/components/EditorMensagem';
import LabelPlus from '@/components/LabelPlus';
import { DepartmentScheduleResponse, ScheduleInterval } from '@/Interfaces';
import ApiClient from '@/service/Api/ApiClient';
import { Alerta, AlertaCallback, CatchAlerta } from '@/service/Util';

/** Domingo primeiro, como a referência visual (Whaticket) - não é a ordem
 * comum de calendário de trabalho brasileiro, mas é a pedida. */
const DIAS_DA_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

type HorarioSetorTabProps = {
  departmentId: number;
  /** Só a aba trocada para esta dispara o carregamento - evita chamada à
   * toa enquanto o modal está noutra aba. */
  ativa: boolean;
  somenteLeitura: boolean;
  /** O rodapé do modal (`ModalFormSetor`) é quem tem o botão "Salvar
   * horário" - o componente só avisa quando o estado de loading muda. */
  onSalvandoChange: (salvando: boolean) => void;
};

export type HorarioSetorTabHandle = {
  salvar: () => Promise<void>;
};

/** Converte "HH:mm" em `Date` (hoje, com essa hora) - o `Calendar` do
 * PrimeReact trabalha com `Date`, não string. */
function paraData(hora: string): Date {
  const [h, m] = hora.split(':').map(Number);
  const data = new Date();
  data.setHours(h, m, 0, 0);
  return data;
}

function paraHora(data: Date): string {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

/**
 * Aba "Horário de atendimento" do cadastro de setor - mesmo padrão da aba
 * "Equipe" (`ModalFormSetor.tsx`): estado próprio, carregado ao trocar de
 * aba, gravado independente do formulário principal.
 *
 * Por dia da semana: toggle liga/desliga (controla só a exibição local dos
 * intervalos daquele dia - desligar e salvar apaga as linhas do dia, não
 * existe uma coluna "ativo" própria) + lista de intervalos, cada um com
 * início/fim + remover. "+ Adicionar horário" acrescenta um intervalo vazio.
 * Mensagem de ausência é texto livre, exibida ao contato fora do horário.
 */
function HorarioSetorTab(
  { departmentId, ativa, somenteLeitura, onSalvandoChange }: HorarioSetorTabProps,
  ref: React.ForwardedRef<HorarioSetorTabHandle>,
) {
  const { FetchReq } = ApiClient();

  const [carregando, setCarregando] = useState(false);
  const [intervalosPorDia, setIntervalosPorDia] = useState<Record<number, ScheduleInterval[]>>({});
  const [mensagemAusencia, setMensagemAusencia] = useState('');

  useEffect(() => {
    if (!ativa) return;

    const carregar = async () => {
      try {
        setCarregando(true);
        const dados = await FetchReq<DepartmentScheduleResponse>({
          endpoint: 'BuscarHorarioSetor',
          variables: [departmentId],
        });

        const agrupado: Record<number, ScheduleInterval[]> = {};
        (dados?.intervals ?? []).forEach((intervalo) => {
          agrupado[intervalo.weekday] = [...(agrupado[intervalo.weekday] ?? []), intervalo];
        });

        setIntervalosPorDia(agrupado);
        setMensagemAusencia(dados?.absence_message ?? '');
      } catch (err) {
        CatchAlerta(err, 'Erro ao carregar o horário do setor');
      } finally {
        setCarregando(false);
      }
    };

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa, departmentId]);

  const diaLigado = (weekday: number) => (intervalosPorDia[weekday]?.length ?? 0) > 0;

  const alternarDia = (weekday: number, ligado: boolean) => {
    setIntervalosPorDia((prev) => ({
      ...prev,
      [weekday]: ligado ? [{ weekday, start_time: '08:00', end_time: '18:00' }] : [],
    }));
  };

  const adicionarIntervalo = (weekday: number) => {
    setIntervalosPorDia((prev) => ({
      ...prev,
      [weekday]: [...(prev[weekday] ?? []), { weekday, start_time: '08:00', end_time: '18:00' }],
    }));
  };

  const atualizarIntervalo = (weekday: number, indice: number, campo: 'start_time' | 'end_time', valor: string) => {
    setIntervalosPorDia((prev) => ({
      ...prev,
      [weekday]: prev[weekday].map((intervalo, i) => (i === indice ? { ...intervalo, [campo]: valor } : intervalo)),
    }));
  };

  const removerIntervalo = (weekday: number, indice: number) => {
    setIntervalosPorDia((prev) => ({
      ...prev,
      [weekday]: prev[weekday].filter((_, i) => i !== indice),
    }));
  };

  const salvar = async () => {
    const intervals = Object.values(intervalosPorDia).flat();

    // Mesma regra do backend (`DepartmentsService.updateSchedule`) validada
    // aqui antes: evita o round-trip só para descobrir o óbvio - horário
    // ativo sem mensagem deixaria o canal mudo fora do expediente.
    if (intervals.length > 0 && !mensagemAusencia.trim()) {
      Alerta('Informe a mensagem de ausência antes de ativar o horário de atendimento.', 'Atenção', 'warning');
      return;
    }

    try {
      onSalvandoChange(true);

      await FetchReq({
        endpoint: 'AtualizarHorarioSetor',
        variables: [departmentId],
        body: { intervals, absence_message: mensagemAusencia.trim() || null },
      });

      AlertaCallback('Horário de atendimento atualizado com sucesso!', () => {}, 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar o horário de atendimento');
    } finally {
      onSalvandoChange(false);
    }
  };

  useImperativeHandle(ref, () => ({ salvar }));

  if (carregando) {
    return (
      <div className="flex justify-content-center p-4">
        <ProgressSpinner className="w-3rem" />
      </div>
    );
  }

  return (
    <div className="flex flex-column gap-4">
      <div>
        <LabelPlus
          text="Mensagem de ausência"
          textHelp="Exibida ao contato quando ele escreve fora do horário configurado abaixo."
        />
        <EditorMensagem
          value={mensagemAusencia}
          onChange={setMensagemAusencia}
          rows={3}
          maxLength={500}
          placeholder="Nosso horário de atendimento é de segunda a sexta, das 08h às 18h."
          disabled={somenteLeitura}
        />
      </div>

      <div className="flex flex-column gap-3">
        {DIAS_DA_SEMANA.map((nomeDia, weekday) => (
          <div
            key={weekday}
            className="border-1 border-300 border-round-lg p-3"
          >
            <div className="flex align-items-center justify-content-between gap-2 mb-2">
              <span className="font-semibold">{nomeDia}</span>
              <InputSwitch
                checked={diaLigado(weekday)}
                disabled={somenteLeitura}
                onChange={(e) => alternarDia(weekday, !!e.value)}
              />
            </div>

            {diaLigado(weekday) && (
              <div className="flex flex-column gap-2">
                {(intervalosPorDia[weekday] ?? []).map((intervalo, indice) => (
                  <div
                    key={indice}
                    className="flex align-items-center gap-2"
                  >
                    <Calendar
                      value={paraData(intervalo.start_time)}
                      onChange={(e) => e.value && atualizarIntervalo(weekday, indice, 'start_time', paraHora(e.value as Date))}
                      timeOnly
                      hourFormat="24"
                      className="flex-1"
                      disabled={somenteLeitura}
                    />
                    <i className={PrimeIcons.ARROW_RIGHT} />
                    <Calendar
                      value={paraData(intervalo.end_time)}
                      onChange={(e) => e.value && atualizarIntervalo(weekday, indice, 'end_time', paraHora(e.value as Date))}
                      timeOnly
                      hourFormat="24"
                      className="flex-1"
                      disabled={somenteLeitura}
                    />
                    <Button
                      icon={PrimeIcons.TRASH}
                      severity="danger"
                      text
                      disabled={somenteLeitura}
                      onClick={() => removerIntervalo(weekday, indice)}
                    />
                  </div>
                ))}

                <Button
                  label="Adicionar horário"
                  icon={PrimeIcons.PLUS}
                  text
                  size="small"
                  className="align-self-start"
                  disabled={somenteLeitura}
                  onClick={() => adicionarIntervalo(weekday)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default forwardRef(HorarioSetorTab);
