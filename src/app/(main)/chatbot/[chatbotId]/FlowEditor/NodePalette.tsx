import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { useState } from 'react';

export type NoDisponivel = {
  type: string;
  label: string;
  icon: string;
  category: string;
};

const NOS_DISPONIVEIS: NoDisponivel[] = [
  { type: 'message', label: 'Mensagem', icon: PrimeIcons.COMMENT, category: 'Conversação' },
  { type: 'menu', label: 'Menu', icon: PrimeIcons.LIST, category: 'Conversação' },
  { type: 'conditional', label: 'Condicional', icon: PrimeIcons.SITEMAP, category: 'Dados e regras' },
  { type: 'holiday', label: 'Feriados', icon: PrimeIcons.CALENDAR, category: 'Dados e regras' },
  { type: 'finish', label: 'Finalizar', icon: PrimeIcons.CHECK_CIRCLE, category: 'Atendimento' },
  { type: 'close_support_chat', label: 'Encerrar atendimento', icon: PrimeIcons.POWER_OFF, category: 'Atendimento' },
  { type: 'set_department', label: 'Definir setor', icon: PrimeIcons.USERS, category: 'Atendimento' },
  { type: 'business_hours', label: 'Verificar horário do setor', icon: PrimeIcons.CLOCK, category: 'Atendimento' },
];

const CATEGORIAS = Array.from(new Set(NOS_DISPONIVEIS.map((no) => no.category)));
const CORES_CATEGORIAS: Record<string, string> = {
  Conversação: 'var(--green-500)',
  'Dados e regras': 'var(--blue-500)',
  Atendimento: 'var(--orange-500)',
};

type NodePaletteProps = {
  onAddNode: (type: string) => void;
};

/**
 * Barra lateral do editor, fora do canvas, com busca e categorias separadas
 * por divisores. Somente os itens são arrastáveis para criar nós no fluxo.
 *
 * ⚠️ Componentes reais do PrimeReact (`Button`/`InputText`), não HTML cru com
 * classes `p-*` soltas - só assim o tema (claro/escuro) e o `Ripple` aplicam
 * de verdade.
 */
function NodePalette({ onAddNode }: NodePaletteProps) {
  const [busca, setBusca] = useState('');

  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const termo = normalizar(busca.trim());
  const filtrados = NOS_DISPONIVEIS.filter((no) => normalizar(`${no.label} ${no.category}`).includes(termo));

  return (
    <div
      className="chatbot-node-palette surface-card border-right-1 border-300 flex flex-column flex-shrink-0 overflow-hidden"
      style={{ width: '18rem', maxWidth: '45%', minHeight: 0 }}
    >
      <div className="flex-shrink-0 flex align-items-center p-3 border-bottom-1 border-300">
        <div className="flex align-items-center gap-2">
          <i className={`${PrimeIcons.BOLT} text-primary`} />
          <div>
            <div className="text-xs font-bold text-primary uppercase">Adicionar Nós</div>
            <div className="text-xs text-color-secondary">Clique ou arraste um bloco para o fluxo</div>
          </div>
        </div>
      </div>

      <div className="p-2 flex-shrink-0">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            className="w-full"
            placeholder="Buscar blocos..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </IconField>
      </div>

      <div className="px-2 pb-2 overflow-y-auto" style={{ minHeight: 0 }}>
        {CATEGORIAS.map((categoria) => {
          const nosDaCategoria = filtrados.filter((no) => no.category === categoria);
          if (!nosDaCategoria.length) return null;

          return (
            <section key={categoria} aria-label={categoria}>
              <Divider align="left" className="chatbot-node-palette-divider">
                <span className="text-xs text-color-secondary">{categoria}</span>
              </Divider>
              <div className="flex flex-column gap-1">
                {nosDaCategoria.map((no) => (
                  <Button
                    key={no.type}
                    type="button"
                    className="chatbot-node-palette-item w-full justify-content-start cursor-grab gap-2"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/chatbot-node-type', no.type);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => onAddNode(no.type)}
                  >
                    <span className="chatbot-node-palette-icon" style={{ color: CORES_CATEGORIAS[categoria] }}>
                      <i className={no.icon} aria-hidden="true" />
                    </span>
                    <span className="text-sm text-left font-normal">{no.label}</span>
                  </Button>
                ))}
              </div>
            </section>
          );
        })}
        {filtrados.length === 0 && (
          <div className="text-color-secondary text-sm p-2">Nenhum bloco encontrado</div>
        )}
      </div>
    </div>
  );
}

export default NodePalette;
