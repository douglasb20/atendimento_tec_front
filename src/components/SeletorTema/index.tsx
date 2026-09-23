'use client';

import { Button } from 'primereact/button';

import { CORES_TEMA, MODOS_TEMA } from '@/service/Tema';

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

type Props = {
  cor: string;
  modo: string;
  escuro: boolean;
  onEscolher: (cor: string, modo: string) => void;
};

/**
 * Os cards de cor e os botões de modo.
 *
 * Extraído do `ModalTema` para a aba Aparência do perfil poder mostrá-los sem
 * um modal dentro do outro. O `ModalTema` continua existindo e consome isto -
 * a lógica de preview e o `aplicaTema` (que troca o `<link>` sem deixar
 * instante sem CSS) ficaram onde estavam.
 */
const SeletorTema = ({ cor, modo, escuro, onEscolher }: Props) => (
  <>
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
            onClick={() => onEscolher(cor, m.id)}
            // O tema estica todo botão dentro de `p-fluid`.
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
              onClick={() => onEscolher(c.id, modo)}
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
  </>
);

export default SeletorTema;
