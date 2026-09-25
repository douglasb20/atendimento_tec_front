import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
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
  { type: 'conditional', label: 'Condicional', icon: PrimeIcons.SITEMAP, category: 'Dados e regras' },
  { type: 'finish', label: 'Finalizar', icon: PrimeIcons.CHECK_CIRCLE, category: 'Atendimento' },
];

const CATEGORIAS = ['Todos', ...Array.from(new Set(NOS_DISPONIVEIS.map((no) => no.category)))];

type NodePaletteProps = {
  onAddNode: (type: string) => void;
};

/**
 * O painel flutuante "Adicionar Nós" - arrastável pelo canvas (via
 * `.custom-drag-handle`, que o React Flow ignora ao decidir se o clique
 * arrasta o canvas ou o painel), com busca e filtro por categoria.
 *
 * Nesta fase só cobre os 3 tipos que o motor já executa (Mensagem,
 * Condicional, Finalizar) - o restante entra na Fase 4 do plano.
 *
 * ⚠️ Componentes reais do PrimeReact (`Button`/`InputText`), não HTML cru com
 * classes `p-*` soltas - só assim o tema (claro/escuro) e o `Ripple` aplicam
 * de verdade.
 */
function NodePalette({ onAddNode }: NodePaletteProps) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [minimizado, setMinimizado] = useState(false);

  const filtrados = NOS_DISPONIVEIS.filter((no) => {
    const bateCategoria = categoria === 'Todos' || no.category === categoria;
    const bateBusca = no.label.toLowerCase().includes(busca.toLowerCase());
    return bateCategoria && bateBusca;
  });

  if (minimizado) {
    return (
      <Button
        label="Restaurar"
        icon={PrimeIcons.PLUS}
        size="small"
        style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}
        onClick={() => setMinimizado(false)}
      />
    );
  }

  return (
    <div
      className="surface-card border-round-lg shadow-3 border-1 border-300"
      style={{ position: 'absolute', top: 16, left: 16, width: '20rem', zIndex: 10 }}
    >
      <div className="custom-drag-handle flex align-items-center justify-content-between p-2 border-bottom-1 border-300 cursor-move">
        <div className="flex align-items-center gap-2">
          <i className={`${PrimeIcons.BOLT} text-primary`} />
          <div>
            <div className="text-xs font-bold text-primary uppercase">Adicionar Nós</div>
            <div className="text-xs text-color-secondary">Clique ou arraste um bloco para o fluxo</div>
          </div>
        </div>
        <Button
          icon={PrimeIcons.MINUS}
          text
          size="small"
          onClick={() => setMinimizado(true)}
        />
      </div>

      <div className="p-2">
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

      <div className="flex flex-wrap gap-1 px-2 pb-2">
        {CATEGORIAS.map((cat) => (
          <Button
            key={cat}
            label={cat}
            size="small"
            rounded
            outlined={categoria !== cat}
            onClick={() => setCategoria(cat)}
          />
        ))}
      </div>

      <div className="grid m-0 p-2 pt-0 gap-2">
        {filtrados.map((no) => (
          <Button
            key={no.type}
            label={no.label}
            icon={no.icon}
            outlined
            className="col-12 justify-content-start cursor-grab"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/chatbot-node-type', no.type);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => onAddNode(no.type)}
          />
        ))}

        {filtrados.length === 0 && (
          <div className="col-12 text-color-secondary text-sm p-2">Nenhum bloco encontrado</div>
        )}
      </div>
    </div>
  );
}

export default NodePalette;
