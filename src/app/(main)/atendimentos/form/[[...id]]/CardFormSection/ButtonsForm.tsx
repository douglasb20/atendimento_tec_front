import { Button } from 'primereact/button';
import { useFormContext } from 'react-hook-form';
import { useService } from '@/contexts/ServicesContext';
import { AlertaRedireciona, CatchAlerta, DateToBR } from '@/service/Util';
import ApiClient from '@/service/Api/ApiClient';
import { AtendimentoFormType } from '.';

export default function ButtonsForm() {
  const { handleSubmit } = useFormContext<AtendimentoFormType>();
  const { setLoading } = useService();
  const { FetchReq } = ApiClient();


  const onSubmit = async (fields: AtendimentoFormType) => {
    try {
      setLoading();
      if (fields.tipo_entrada === 'T') {
        fields.services = [];
      } else {
        if (fields.services.length === 0) {
          throw new Error('Insira pelo menos 1 serviço.');
        }
      }

      const dataPost = {
        client_id: fields.client_id === -1 ? null : fields.client_id,
        contact_id: fields.contact_id === -1 ? null : fields.contact_id,
        user_id: fields.user_id,
        data_referencia: DateToBR(fields.data_referencia, 'yyyy-MM-dd'),
        hora_inicio: DateToBR(fields.hora_inicio, 'HH:mm:ss'),
        hora_fim: DateToBR(fields.hora_fim, 'HH:mm:ss'),
        comentario: fields.comentario,
        tipo_entrada: fields.tipo_entrada,
        esta_pago: fields.esta_pago,
        atendimento_status_id: fields.atendimento_status_id,
        atendimentosServicos: fields.services.map(e => ({service_id: e.service_id, valor_cobrado: e.valor_cobrado})),
      };
      if (fields.id === null) {
        await FetchReq({
          endpoint: 'AdicionarAtendimento',
          body: dataPost
        });
      }
      AlertaRedireciona("Atendimento salvo com sucesso", '/atendimentos', 'success');
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar atendimento');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex justify-content-between flex-1 gap-2 px-2 mt-2">
      <Button
        className="w-auto"
        label="Voltar"
        outlined
        severity="warning"
      />
      <Button
        className="w-auto"
        label="Salvar"
        onClick={handleSubmit(onSubmit)}
      />
    </div>
  );
}

