'use client';

import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { useEffect, useRef, useState } from 'react';

import { useTema } from '@/hooks/useTema';
import { Alerta, CatchAlerta } from '@/service/Util';
import { CORES_TEMA, MODOS_TEMA } from '@/service/Tema';

type ModalTemaProps = {
  visible: boolean;
  onHide: () => void;
};

/** Amostra do tema: a barra superior, o campo e o botão, como na tela real. */
const Previa = ({ cor, escuro }: { cor: (typeof CORES_TEMA)[number]; escuro: boolean }) => {
  const paleta = escuro ? cor.escuro : cor.claro;
  const fundo = escuro ? '#161a1f' : '#ffffff';
  const campo = escuro ? '#22272e' : '#f3f4f6';

  return (
    <div
      className="border-round overflow-hidden mb-3"
      style={{ background: fundo, border: `1px solid ${escuro ? '#2a2e34' : '#e5e7eb'}` }}
    >
      <div style={{ height: 6, background: paleta.primary }} />
      <div className="flex align-items-center gap-2 p-2">
        <div
          className="flex-1 border-round"
          style={{ height: 14, background: campo }}
        />
        <div
          className="border-circle flex-none"
          style={{ width: 16, height: 16, background: paleta.primary }}
        />
      </div>
    </div>
  );
};

/**
 * Escolha do tema da interface.
 *
 * As mudanças valem na hora, antes de salvar: escolher cor por descrição não
 * funciona - é preciso ver. Fechar sem confirmar desfaz, porque experimentar
 * não pode ser o mesmo que decidir.
 */
const ModalTema = ({ visible, onHide }: ModalTemaProps) => {
  const { cor, modo, salvando, previsualizar, salvar, descartar } = useTema();
  const [corInicial, setCorInicial] = useState(cor);
  const [modoInicial, setModoInicial] = useState(modo);

  // O estado de onde o preview partiu, para saber se houve mudança e para o
  // "Cancelar" ter para onde voltar.
  useEffect(() => {
    if (visible) {
      setCorInicial(cor);
      setModoInicial(modo);
    }
    // Só ao abrir: incluir `cor`/`modo` faria o alvo do cancelamento andar
    // junto com o preview, e não haveria mais a que voltar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const mudou = cor !== corInicial || modo !== modoInicial;
  const escuro = modo !== 'claro';

  // ⚠️ O `Dialog` dispara `onHide` sempre que fecha - inclusive quando somos
  // nós que o fechamos depois de aplicar. Sem esta trava, o "Aplicar" salvava
  // e em seguida o `descartar` do `onHide` desfazia na tela.
  const aplicandoRef = useRef(false);

  const aoFechar = async () => {
    if (aplicandoRef.current) {
      aplicandoRef.current = false;
      onHide();
      return;
    }

    await descartar();
    onHide();
  };

  const confirmar = async () => {
    try {
      await salvar(cor, modo);
      aplicandoRef.current = true;
      Alerta('Tema aplicado com sucesso!', 'Aviso', 'success');
      onHide();
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível salvar o tema');
    }
  };

  const rodape = () => (
    <div className="flex justify-content-between">
      <Button
        label="Cancelar"
        severity="danger"
        outlined
        onClick={aoFechar}
        disabled={salvando}
        // O tema estica todo botão dentro de `p-fluid`.
        style={{ width: 'auto' }}
      />
      <Button
        label="Aplicar"
        icon="fa-regular fa-check"
        loading={salvando}
        disabled={!mudou}
        onClick={confirmar}
        style={{ width: 'auto' }}
      />
    </div>
  );

  return (
    <Modal
      modal
      className="p-fluid"
      style={{ width: '52rem' }}
      breakpoints={{ '960px': '95vw' }}
      visible={visible}
      header="Selecione um tema"
      onHide={aoFechar}
      footer={rodape}
    >
      <p className="mt-0 mb-4 text-color-secondary">
        As mudanças aparecem na hora. Feche sem aplicar para voltar ao tema atual.
      </p>

      <div className="mb-4">
        <span className="block mb-2 font-medium">Modo</span>
        <div className="flex flex-wrap gap-2">
          {MODOS_TEMA.map((m) => (
            <Button
              key={m.id}
              type="button"
              label={m.rotulo}
              icon={
                m.id === 'claro'
                  ? 'fa-regular fa-sun'
                  : m.id === 'dim'
                    ? 'fa-regular fa-cloud-moon'
                    : 'fa-regular fa-moon'
              }
              outlined={modo !== m.id}
              tooltip={m.descricao}
              tooltipOptions={{ position: 'top' }}
              onClick={() => previsualizar(cor, m.id)}
              style={{ width: 'auto' }}
            />
          ))}
        </div>
      </div>

      <span className="block mb-2 font-medium">Cor</span>
      <div className="grid">
        {CORES_TEMA.map((c) => {
          const selecionada = c.id === cor;

          return (
            <div
              key={c.id}
              className="col-12 md:col-6 lg:col-4"
            >
              <button
                type="button"
                onClick={() => previsualizar(c.id, modo)}
                aria-pressed={selecionada}
                className={`w-full text-left cursor-pointer border-round-lg p-3 transition-colors transition-duration-150 ${
                  selecionada
                    ? 'border-2 border-primary surface-50'
                    : 'border-1 surface-border surface-card hover:surface-hover'
                }`}
              >
                <Previa
                  cor={c}
                  escuro={escuro}
                />

                <div className="flex align-items-center justify-content-between gap-2">
                  <span className="font-semibold">{c.rotulo}</span>
                  {selecionada && <i className="fa-solid fa-circle-check text-primary" />}
                </div>
                <small className="block mt-1 text-color-secondary">{c.descricao}</small>
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

export default ModalTema;
