'use client';

import { useState } from 'react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';

import TitleCards from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { AjusteAtendimento } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { Alerta, CatchAlerta } from '@/service/Util';
import { useAjustesAtendimentoStore } from '@/store/useAjustesAtendimentoStore';

type Props = { data: AjusteAtendimento[] };

export default function DadosAtendimentoSection({ data }: Props) {
  const [ajustes, setAjustes] = useState(data ?? []);
  // Só o que foi mexido: enviar tudo faria o `PATCH` regravar valores
  // inalterados e marcar `updated_by` em campos que ninguém tocou.
  const [alterados, setAlterados] = useState<Record<string, boolean>>({});
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const definirNaStore = useAjustesAtendimentoStore((s) => s.definir);

  const valorAtual = (a: AjusteAtendimento): boolean => alterados[a.chave] ?? a.valor;

  const alterar = (chave: string, valor: boolean) =>
    setAlterados((atual) => ({ ...atual, [chave]: valor }));

  const temAlteracao = Object.keys(alterados).length > 0;

  // Mesma flag do item de menu "Chatbot" (`AppMenu.tsx`): a feature ainda não
  // foi para produção, e mostrar aqui uma configuração de algo que não existe
  // pro cliente confundiria mais do que ajudaria.
  const ajustesVisiveis = ajustes.filter(
    (a) => a.chave !== 'notificar_mensagem_chatbot' || process.env.SHOW_CHATBOT_MENU === 'true',
  );

  const Salvar = async () => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'AtualizarAjustesAtendimento', body: { ajustes: alterados } });

      const dados = await FetchReq<AjusteAtendimento[]>('ListarAjustesAtendimento');
      setAjustes(dados ?? []);
      setAlterados({});

      // A store acompanha: sem isto, salvar aqui mudaria a tela e não o
      // comportamento do resto do portal até a próxima carga de página -
      // mesmo bug que `usePreferenciasStore` já teve.
      definirNaStore(Object.fromEntries((dados ?? []).map((a) => [a.chave, a.valor])));

      Alerta('Configurações salvas.', 'Pronto', 'success');
    } catch (err) {
      CatchAlerta(err, 'Não foi possível salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TitleCards title="Configurações de atendimento" />

      <div className="p-card-content">
        <div className="grid mb-4">
          {ajustesVisiveis.map((a) => (
            <div
              key={a.chave}
              className="col-12 md:col-6 p-fluid"
            >
              <div className="flex align-items-center gap-3">
                <InputSwitch
                  inputId={a.chave}
                  checked={valorAtual(a)}
                  onChange={(e) => alterar(a.chave, Boolean(e.value))}
                />
                <label
                  htmlFor={a.chave}
                  className="text-900 font-medium"
                >
                  {a.rotulo}
                </label>
              </div>
              <small className="text-500 block mt-1">{a.descricao}</small>
            </div>
          ))}
        </div>

        <div className="flex justify-content-end gap-2 pt-3 border-top-1 border-200">
          <Button
            label="Descartar"
            className="p-button-text"
            disabled={!temAlteracao}
            onClick={() => setAlterados({})}
          />
          <Button
            label="Salvar alterações"
            icon={PrimeIcons.CHECK}
            disabled={!temAlteracao}
            onClick={Salvar}
          />
        </div>
      </div>
    </>
  );
}
