import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputSwitch } from 'primereact/inputswitch';
import { PrimeIcons } from 'primereact/api';
import { ProgressSpinner } from 'primereact/progressspinner';
import { classNames } from 'primereact/utils';
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
 * Por dia da semana: um switch "Atende neste dia" (não existe coluna "ativo"
 * própria - desligar e salvar apaga as linhas do dia) que só abre a lista de
 * janelas de horário; salvar exige ao menos uma janela quando ligado, não há
 * estado "atende sem horário definido". "+ Adicionar horário" acrescenta uma
 * janela (pode haver várias). Mensagem de ausência é texto livre, exibida ao
 * contato fora do horário.
 */
function HorarioSetorTab(
  { departmentId, ativa, somenteLeitura, onSalvandoChange }: HorarioSetorTabProps,
  ref: React.ForwardedRef<HorarioSetorTabHandle>,
) {
  const { FetchReq } = ApiClient();

  const [carregando, setCarregando] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [intervalosPorDia, setIntervalosPorDia] = useState<Record<number, ScheduleInterval[]>>({});
  const [atendeDia, setAtendeDia] = useState<Record<number, boolean>>({});
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

        const atende: Record<number, boolean> = {};
        Object.entries(agrupado).forEach(([weekday, intervalos]) => {
          atende[Number(weekday)] = intervalos.length > 0;
        });

        setIntervalosPorDia(agrupado);
        setAtendeDia(atende);
        setMensagemAusencia(dados?.absence_message ?? '');
        setScheduleEnabled(dados?.schedule_enabled ?? false);
      } catch (err) {
        CatchAlerta(err, 'Erro ao carregar o horário do setor');
      } finally {
        setCarregando(false);
      }
    };

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa, departmentId]);

  // "Atende neste dia" não tem coluna própria: é derivado de um estado que o
  // front guarda por fora da lista de intervalos, porque "atende, sem nenhum
  // horário ainda adicionado" e "fechado" são os dois o mesmo array vazio.
  const alternarAtendeNesteDia = (weekday: number, atende: boolean) => {
    setAtendeDia((prev) => ({ ...prev, [weekday]: atende }));

    setIntervalosPorDia((prev) => ({
      ...prev,
      // Desligar limpa os intervalos do dia - reabrir começa com uma janela
      // padrão, não com a antiga escondida esperando para voltar. Ligar já
      // entra com uma janela pronta: sem isso, o aviso de "adicione um
      // horário" apareceria assim que o switch fosse ligado.
      [weekday]: atende ? [{ weekday, start_time: '08:00', end_time: '18:00' }] : [],
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
    // "Atende neste dia" sem nenhuma janela preenchida é formulário
    // incompleto, não "atende o dia todo" - exige pelo menos um horário antes
    // de deixar salvar.
    const diaSemHorario = DIAS_DA_SEMANA.findIndex(
      (_, weekday) => atendeDia[weekday] && (intervalosPorDia[weekday] ?? []).length === 0,
    );
    if (diaSemHorario !== -1) {
      Alerta(
        `Adicione ao menos um horário para ${DIAS_DA_SEMANA[diaSemHorario]}, ou desligue "Atende neste dia".`,
        'Atenção',
        'warning',
      );
      return;
    }

    const intervals = Object.values(intervalosPorDia).flat();

    // Mesma regra do backend (`DepartmentsService.updateSchedule`) validada
    // aqui antes: evita o round-trip só para descobrir o óbvio - horário
    // ativo sem mensagem deixaria o canal mudo fora do expediente.
    if (scheduleEnabled && !mensagemAusencia.trim()) {
      Alerta('Informe a mensagem de ausência antes de ativar o horário de atendimento.', 'Atenção', 'warning');
      return;
    }

    try {
      onSalvandoChange(true);

      await FetchReq({
        endpoint: 'AtualizarHorarioSetor',
        variables: [departmentId],
        body: { schedule_enabled: scheduleEnabled, intervals, absence_message: mensagemAusencia.trim() || null },
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
      <div className="flex align-items-center justify-content-between gap-2 border-1 border-300 border-round-lg p-3">
        <div>
          <span className="font-semibold block">Usar horário de atendimento</span>
          <span className="text-sm text-color-secondary">
            Desligado, o setor fica sempre disponível - a configuração abaixo é ignorada.
          </span>
        </div>
        <InputSwitch
          checked={scheduleEnabled}
          disabled={somenteLeitura}
          onChange={(e) => setScheduleEnabled(!!e.value)}
        />
      </div>

      <div>
        <LabelPlus
          text="Mensagem de ausência"
          textHelp="Exibida ao contato quando ele escreve fora do horário configurado abaixo."
          required={scheduleEnabled}
        />
        <EditorMensagem
          value={mensagemAusencia}
          onChange={setMensagemAusencia}
          rows={3}
          maxLength={500}
          placeholder="Nosso horário de atendimento é de segunda a sexta, das 08h às 18h."
          disabled={somenteLeitura || !scheduleEnabled}
        />
      </div>

      <div className={classNames('flex flex-column gap-3', { 'opacity-60': !scheduleEnabled })}>
        {DIAS_DA_SEMANA.map((nomeDia, weekday) => (
          <div
            key={weekday}
            className="border-1 border-300 border-round-lg p-3"
          >
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
              <span className="font-semibold">{nomeDia}</span>
              <div className="flex align-items-center gap-2">
                <span className="text-sm text-color-secondary">Atende neste dia</span>
                <InputSwitch
                  checked={Boolean(atendeDia[weekday])}
                  disabled={somenteLeitura || !scheduleEnabled}
                  onChange={(e) => alternarAtendeNesteDia(weekday, !!e.value)}
                />
              </div>
            </div>

            {atendeDia[weekday] && (
              <div className="flex flex-column gap-2">
                {(intervalosPorDia[weekday] ?? []).length === 0 && (
                  <span className="text-sm text-orange-500 mb-1">
                    Adicione ao menos um horário, ou desligue &quot;Atende neste dia&quot;.
                  </span>
                )}

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
                      disabled={somenteLeitura || !scheduleEnabled}
                    />
                    <i className={PrimeIcons.ARROW_RIGHT} />
                    <Calendar
                      value={paraData(intervalo.end_time)}
                      onChange={(e) => e.value && atualizarIntervalo(weekday, indice, 'end_time', paraHora(e.value as Date))}
                      timeOnly
                      hourFormat="24"
                      className="flex-1"
                      disabled={somenteLeitura || !scheduleEnabled}
                    />
                    <Button
                      icon={PrimeIcons.TRASH}
                      severity="danger"
                      text
                      disabled={somenteLeitura || !scheduleEnabled}
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
                  disabled={somenteLeitura || !scheduleEnabled}
                  onClick={() => adicionarIntervalo(weekday)}
                />
              </div>
            )}

            {!atendeDia[weekday] && (
              <span className="text-sm text-color-secondary">Não atende neste dia.</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default forwardRef(HorarioSetorTab);
