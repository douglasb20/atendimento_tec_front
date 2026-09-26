'use client';

import { useMemo, useState } from 'react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';

import TitleCards from '@/components/TitleCards';
import { useService } from '@/contexts/ServicesContext';
import { AjusteSistema, ResultadoTesteEmail } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { Alerta, CatchAlerta } from '@/service/Util';

type Props = { data: AjusteSistema[] };

export default function DadosSistemaSection({ data }: Props) {
  const [ajustes, setAjustes] = useState(data ?? []);
  // Só o que foi mexido: enviar tudo faria o `PATCH` regravar valores
  // inalterados e marcar `updated_by` em campos que ninguém tocou.
  const [alterados, setAlterados] = useState<Record<string, string | number>>({});
  const [senhaRevelada, setSenhaRevelada] = useState(false);
  const [testando, setTestando] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();

  const porGrupo = useMemo(
    () => ({
      comportamento: ajustes.filter((a) => a.grupo === 'comportamento'),
      email: ajustes.filter((a) => a.grupo === 'email'),
    }),
    [ajustes],
  );

  const valorAtual = (a: AjusteSistema): string | number => alterados[a.chave] ?? a.valor ?? '';

  const alterar = (chave: string, valor: string | number) =>
    setAlterados((atual) => ({ ...atual, [chave]: valor }));

  const temAlteracao = Object.keys(alterados).length > 0;

  const Recarregar = async () => {
    const dados = await FetchReq<AjusteSistema[]>('ListarAjustesSistema');
    setAjustes(dados ?? []);
    setAlterados({});
    setSenhaRevelada(false);
  };

  const Salvar = async () => {
    try {
      setLoading(true);
      await FetchReq({ endpoint: 'AtualizarAjustesSistema', body: { ajustes: alterados } });
      await Recarregar();
      Alerta('Configurações salvas.', 'Pronto', 'success');
    } catch (err) {
      // O backend recusa fora de faixa com a mensagem já pronta, nomeando o
      // campo e o limite.
      CatchAlerta(err, 'Não foi possível salvar');
    } finally {
      setLoading(false);
    }
  };

  const TestarEmail = async () => {
    try {
      setTestando(true);

      // Manda o que está na tela, inclusive o que ainda não foi salvo: o teste
      // serve justamente para conferir antes de gravar.
      const corpo: Record<string, unknown> = {
        destinatario: valorAtual(
          ajustes.find((a) => a.chave === 'email_user') ?? ({} as AjusteSistema),
        ),
      };

      for (const [chave, valor] of Object.entries(alterados)) {
        if (chave.startsWith('email_') && chave !== 'email_from') {
          corpo[chave.replace('email_', '')] = valor;
        }
      }

      const r = await FetchReq<ResultadoTesteEmail>({
        endpoint: 'TestarEmailSistema',
        body: corpo,
      });

      if (r?.ok) {
        Alerta(
          `Mensagem de teste enviada para ${corpo.destinatario}. Confira a caixa de entrada.`,
          'Conexão funcionando',
          'success',
        );
      } else {
        // A mensagem vem do próprio servidor de e-mail - "Username and Password
        // not accepted", por exemplo. É mais útil que um texto nosso genérico.
        Alerta(r?.erro ?? 'Não foi possível enviar.', 'Falhou', 'error');
      }
    } catch (err) {
      CatchAlerta(err, 'Não foi possível testar');
    } finally {
      setTestando(false);
    }
  };

  const CampoNumero = (a: AjusteSistema) => (
    <div
      key={a.chave}
      className="col-12 md:col-6 p-fluid"
    >
      <label
        htmlFor={a.chave}
        className="block text-900 font-medium mb-2"
      >
        {a.rotulo}
      </label>
      <InputNumber
        inputId={a.chave}
        value={Number(valorAtual(a))}
        onValueChange={(e) => alterar(a.chave, e.value ?? 0)}
        min={a.min}
        max={a.max}
        suffix={a.unidade ? ` ${a.unidade}` : undefined}
        useGrouping={false}
        showButtons
      />
      <small className="text-500 block mt-1">{a.descricao}</small>
      {a.min !== undefined && a.max !== undefined && (
        <small className="text-500 block">
          Entre {a.min} e {a.max} {a.unidade}.
        </small>
      )}
    </div>
  );

  const CampoTexto = (a: AjusteSistema) => (
    <div
      key={a.chave}
      className="col-12 md:col-6 p-fluid"
    >
      <label
        htmlFor={a.chave}
        className="block text-900 font-medium mb-2"
      >
        {a.rotulo}
      </label>
      <InputText
        id={a.chave}
        value={String(valorAtual(a))}
        onChange={(e) => alterar(a.chave, e.target.value)}
        autoComplete="off"
      />
      <small className="text-500 block mt-1">{a.descricao}</small>
    </div>
  );

  const CampoSenha = (a: AjusteSistema) => (
    <div
      key={a.chave}
      className="col-12 md:col-6 p-fluid"
    >
      <label
        htmlFor={a.chave}
        className="block text-900 font-medium mb-2"
      >
        {a.rotulo}
      </label>
      <IconField iconPosition="right">
        <InputIcon
          className={classNames('cursor-pointer', senhaRevelada ? 'pi pi-eye-slash' : 'pi pi-eye')}
          onClick={() => setSenhaRevelada((v) => !v)}
          role="button"
          tabIndex={0}
          aria-label={senhaRevelada ? 'Ocultar a senha' : 'Mostrar a senha'}
          title={senhaRevelada ? 'Ocultar' : 'Mostrar'}
        />
        <InputText
          id={a.chave}
          // Alternar `type` no mesmo input, em vez de renderizar dois: trocar
          // de elemento faria o campo perder o foco a cada clique no olho.
          type={senhaRevelada ? 'text' : 'password'}
          value={String(alterados[a.chave] ?? '')}
          onChange={(e) => alterar(a.chave, e.target.value)}
          autoComplete="new-password"
          // Em branco significa "mantém a que está gravada" - a senha nunca sai
          // da API, então não há o que preencher aqui.
          placeholder={a.definido ? '•••••••• (definida)' : 'Não definida'}
        />
      </IconField>
      <small className="text-500 block mt-1">{a.descricao}</small>
    </div>
  );

  const Campo = (a: AjusteSistema) =>
    a.tipo === 'senha' ? CampoSenha(a) : a.tipo === 'inteiro' ? CampoNumero(a) : CampoTexto(a);

  return (
    <>
      <TitleCards title="Configurações do sistema" />

      <div className="p-card-content">
        <Message
          severity="warn"
          className="w-full justify-content-start mb-4"
          text="Estes ajustes valem para todos os atendentes do portal."
        />

        <h3 className="text-900 text-lg font-semibold mb-1">Comportamento</h3>
        <div className="grid mb-4">{porGrupo.comportamento.map(Campo)}</div>

        <div className="flex align-items-center justify-content-between mb-1">
          <h3 className="text-900 text-lg font-semibold m-0">E-mail</h3>
          <Button
            label="Testar conexão"
            icon={PrimeIcons.SEND}
            className="p-button-text p-button-sm"
            loading={testando}
            onClick={TestarEmail}
          />
        </div>
        <small className="text-500 block mb-3">
          Usado para enviar o link de redefinição de senha. A alteração vale na próxima mensagem,
          sem reiniciar o sistema.
        </small>
        <div className="grid mb-4">{porGrupo.email.map(Campo)}</div>

        <div className="flex justify-content-end gap-2 pt-3 border-top-1 border-200">
          <Button
            label="Descartar"
            className="p-button-text"
            disabled={!temAlteracao}
            onClick={() => {
              setAlterados({});
              setSenhaRevelada(false);
            }}
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
