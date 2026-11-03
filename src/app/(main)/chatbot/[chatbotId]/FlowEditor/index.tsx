'use client';

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Connection,
  ControlButton,
  Controls,
  Edge,
  EdgeChange,
  MarkerType,
  Node,
  NodeProps,
  NodeChange,
  ReactFlow,
  useOnViewportChange,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './flow-editor.scss';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ChatbotFlowEdge,
  ChatbotFlowNode,
  ChatbotFlowVersionResponse,
  ChatbotFlowViewport,
  ChatbotResponse,
} from '@/Interfaces';
import { useService } from '@/contexts/ServicesContext';
import { useTema } from '@/hooks/useTema';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useAjustesAtendimento } from '@/hooks/useAjustesAtendimento';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta, ConfirmaAcao } from '@/service/Util';
import { mostrarToast } from '@/components/ToastGlobal';
import LabelPlus from '@/components/LabelPlus';

import NodeConfigDrawer from './NodeConfigDrawer';
import ConditionalNode from './nodeTypes/ConditionalNode';
import CloseSupportChatNode from './nodeTypes/CloseSupportChatNode';
import FinishNode from './nodeTypes/FinishNode';
import HolidayNode from './nodeTypes/HolidayNode';
import MenuNode from './nodeTypes/MenuNode';
import MessageNode from './nodeTypes/MessageNode';
import StartNode from './nodeTypes/StartNode';
import SetDepartmentNode from './nodeTypes/SetDepartmentNode';
import HandoffNode from './nodeTypes/HandoffNode';
import BusinessHoursNode from './nodeTypes/BusinessHoursNode';
import NodePalette from './NodePalette';

function comControleDeEdicao(Componente: React.ComponentType<NodeProps>) {
  return function NoComPermissao(props: NodeProps) {
    return <fieldset disabled={Boolean(props.data.somenteLeitura)} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <Componente {...props} />
    </fieldset>;
  };
}

const NODE_TYPES = {
  start: StartNode,
  set_department: comControleDeEdicao(SetDepartmentNode),
  handoff: comControleDeEdicao(HandoffNode),
  business_hours: comControleDeEdicao(BusinessHoursNode),
  message: comControleDeEdicao(MessageNode),
  conditional: comControleDeEdicao(ConditionalNode),
  close_support_chat: comControleDeEdicao(CloseSupportChatNode),
  menu: comControleDeEdicao(MenuNode),
  holiday: comControleDeEdicao(HolidayNode),
  finish: comControleDeEdicao(FinishNode),
};

/**
 * Posição inicial dentro do canvas. A barra de nós ocupa sua própria coluna;
 * não é necessário reservar espaço para ela no viewport do fluxo.
 */
const VIEWPORT_PADRAO = { x: 80, y: 80, zoom: 1 };

const OPCOES_LIGACAO = {
  markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--blue-500)', width: 20, height: 20 },
};

const DATA_PADRAO_POR_TIPO: Record<string, Record<string, unknown>> = {
  message: { messageType: 'text', value: '', continueOn: 'auto' },
  conditional: { compareUsing: 'last_message', conditions: [], defaultOutputHandle: 'default' },
  menu: { title: '', body: '', options: [], invalidOptionOutputHandle: 'invalid', invalidOptionAction: 'repeat_menu', invalidAttemptLimitEnabled: false, maxInvalidAttempts: 3 },
  holiday: { holidayOutputHandle: 'holiday', notHolidayOutputHandle: 'not_holiday' },
  finish: {},
  close_support_chat: { enviarDespedida: true, executarFluxoSaida: false },
  set_department: {},
  handoff: { destination: 'department' },
  business_hours: {},
};

type FlowEditorProps = {
  chatbotId: number;
  versao: ChatbotFlowVersionResponse;
  chatbot: ChatbotResponse;
};

/**
 * Converte o grafo persistido (nosso formato) para o que o React Flow espera.
 *
 * Filtra nós/edges sem `id` (grafo gravado malformado, por exemplo por um
 * teste manual com payload incorreto) - sem isso o React Flow quebra a tela
 * inteira ao tentar ler `position.x` de um nó inexistente.
 */
function paraReactFlow(nodes: ChatbotFlowNode[], edges: ChatbotFlowEdge[]) {
  const nosValidos = nodes.filter((n) => n && n.id && n.position && Number.isFinite(n.position.x) && Number.isFinite(n.position.y));
  if (!nosValidos.some((no) => no.type === 'start')) {
    let idInicio = 'start';
    while (nosValidos.some(no => no.id === idInicio)) idInicio += '_fixo';
    nosValidos.unshift({ id: idInicio, type: 'start', position: { x: 0, y: 0 }, data: {} });
  }
  return {
    nodes: nosValidos.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data,
      ...(n.type === 'start' && { draggable: false, deletable: false, selectable: false }),
    }) as Node),
    edges: edges
      .filter((e) => e && e.id && e.source && e.target)
      .map(
        (e) =>
          ({
            id: e.id,
            source: e.source,
            sourceHandle: e.sourceHandle,
            target: e.target,
            targetHandle: e.targetHandle,
          }) as Edge,
      ),
  };
}

function FlowEditor({ chatbotId, versao, chatbot }: FlowEditorProps) {
  const { pode } = usePermissoes();
  const { ajustes } = useAjustesAtendimento();
  const podeEditar = pode('chatbot:update');
  const podePublicar = pode('chatbot:publish');
  const inicial = useMemo(() => paraReactFlow(versao.graph.nodes, versao.graph.edges), [versao]);
  const viewportInicial = versao.graph.viewport ?? VIEWPORT_PADRAO;

  // O editor sempre trabalha no rascunho. O ponteiro publicado só muda
  // explicitamente ao publicar ou retirar o fluxo de operação.
  const [versaoPublicadaId, setVersaoPublicadaId] = useState(chatbot.current_published_version_id);
  const [alteracoesSalvasPendentes, setAlteracoesSalvasPendentes] = useState(versao.has_unpublished_changes ?? chatbot.has_unpublished_changes ?? false);
  const emProducao = versaoPublicadaId != null;
  const somenteLeitura = !podeEditar || !ajustes.chatbot_habilitado;

  const [nodes, setNodes] = useState<Node[]>(inicial.nodes);
  const [edges, setEdges] = useState<Edge[]>(inicial.edges);
  const [nodeSelecionado, setNodeSelecionado] = useState<ChatbotFlowNode | null>(null);
  const [dirty, setDirty] = useState(!versao.graph.nodes.some(no => no.id && no.type === 'start'
    && no.position && Number.isFinite(no.position.x) && Number.isFinite(no.position.y)));
  const [rendered, setRendered] = useState(false);
  const { setLoading } = useService();
  const { FetchReq } = useApi();
  const { modo } = useTema();
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Atualizada a cada pan/zoom (via `RastrearViewport`, dentro da árvore do
  // `<ReactFlow>`) e lida só no momento de salvar - uma ref evita re-render
  // do `FlowEditor` a cada movimento do canvas.
  const viewportRef = useRef<ChatbotFlowViewport>(viewportInicial);

  useEffect(() => {
    setRendered(true);
  }, []);

  // Lê a classe `layout-<modo>` do `<html>` (a mesma que `aplicaTema` escreve
  // no DOM) em vez de confiar só no `useTema()`: ele começa em `carregado:
  // false` e o `<html>` já pode ter o modo certo antes do hook sincronizar. O
  // observer cobre a troca em tempo real pelo modal de Perfil, sem reload.
  useEffect(() => {
    const html = document.documentElement;

    const lerModo = () => {
      const escuro = html.classList.contains('layout-escuro') || html.classList.contains('layout-dim');
      setColorMode(escuro ? 'dark' : 'light');
    };

    lerModo();

    const observer = new MutationObserver(lerModo);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (somenteLeitura) return;
      const idsFixos = new Set(nodes.filter(no => no.type === 'start').map(no => no.id));
      const permitidas = changes.filter(mudanca => !('id' in mudanca && idsFixos.has(mudanca.id)
        && ['position', 'remove', 'replace', 'select'].includes(mudanca.type)));
      if (!permitidas.length) return;
      setNodes((nds) => applyNodeChanges(permitidas, nds));
      if (permitidas.some(mudanca => !['dimensions', 'select'].includes(mudanca.type))) setDirty(true);
    },
    [somenteLeitura, nodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (somenteLeitura) return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
      if (changes.some(mudanca => mudanca.type !== 'select')) setDirty(true);
    },
    [somenteLeitura],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (somenteLeitura) return;
      setEdges((eds) => addEdge(connection, eds));
      setDirty(true);
    },
    [somenteLeitura],
  );

  const onNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      // Sem permissão de edição o fluxo é só consulta - nenhum nó abre configuração,
      // para não sugerir uma edição que o backend vai recusar ao salvar.
      if (somenteLeitura) return;

      // Mensagem e Menu se configuram inline, sem modal - clicar neles não
      // abre o `NodeConfigDrawer` (que só resta para Condicional).
      if (['message', 'menu', 'close_support_chat', 'set_department', 'handoff', 'business_hours', 'finish', 'start', 'holiday'].includes(node.type ?? '')) return;

      // Descarta `onRemove`/`onChange` injetados - `nodeSelecionado.data`
      // alimenta o `NodeConfigDrawer` e depois volta inteiro via
      // `atualizarDadosDoNo`, gravando a função junto se não for removida aqui.
      const { onRemove: _onRemove, onChange: _onChange, ...dataSemCallbacks } = (node.data ?? {}) as Record<
        string,
        unknown
      >;
      setNodeSelecionado({
        id: node.id,
        type: node.type ?? '',
        position: node.position,
        data: dataSemCallbacks as any,
      });
    },
    [somenteLeitura],
  );

  const adicionarNo = (type: string, position?: { x: number; y: number }) => {
    if (somenteLeitura || type === 'start' || !(type in DATA_PADRAO_POR_TIPO)) return;

    const id = `${type}_${Date.now()}`;
    const novoNode: Node = {
      id,
      type,
      position: position ?? { x: 250, y: 100 + nodes.length * 60 },
      data: DATA_PADRAO_POR_TIPO[type] ?? {},
    };
    setNodes((nds) => [...nds, novoNode]);
    setDirty(true);
  };

  const atualizarDadosDoNo = (nodeId: string, data: Record<string, unknown>) => {
    if (somenteLeitura) return;
    // Nós inline enviam só os campos alterados. Substituir o objeto inteiro
    // apagava o destino ao escolher um atendente e as opções dos outros nós.
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)));
    setNodeSelecionado((atual) => (atual?.id === nodeId ? { ...atual, data: { ...atual.data, ...data } } : atual));
    setDirty(true);
  };

  const removerSaida = (nodeId: string, handleId: string) => {
      if (somenteLeitura) return;
    setEdges((eds) => eds.filter((e) => !(e.source === nodeId && e.sourceHandle === handleId)));
    setDirty(true);
  };

  /** Remove o nó e qualquer edge ligada a ele (senão ficaria apontando para
   * um id inexistente). O nó Início não usa este callback - é fixo. */
  const removerNo = (nodeId: string) => {
    if (somenteLeitura || nodes.some(no => no.id === nodeId && no.type === 'start')) return;
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setNodeSelecionado((atual) => (atual?.id === nodeId ? null : atual));
    setDirty(true);
  };

  // Injetado em `data` na hora de passar para o React Flow, não gravado no
  // grafo: cada `nodeType` chama `data.onRemove()`/`data.onChange()` sem
  // precisar saber que o estado é controlado pelo `FlowEditor`, e
  // `salvarFluxo` já reconstrói o `data` a partir do zero (sem essas funções)
  // ao montar o payload. Mensagem e Menu usam `onChange` para a configuração
  // inline; os demais tipos continuam editando via `NodeConfigDrawer`.
  const nodesComCallbacks = useMemo(
    () =>
      nodes.map((n) =>
        n.type === 'start'
          ? { ...n, draggable: false, deletable: false, selectable: false }
          : {
              ...n,
              data: {
                ...n.data,
                somenteLeitura,
                fluxoSaida: chatbot.type === 'saida',
                onRemove: () => removerNo(n.id),
                ...(['message', 'menu', 'close_support_chat', 'set_department', 'handoff', 'business_hours'].includes(n.type ?? '') && {
                  onChange: (data: Record<string, unknown>) => atualizarDadosDoNo(n.id, data),
                }),
                ...(['menu', 'message'].includes(n.type ?? '') && {
                  onRemoveOutput: (handleId: string) => removerSaida(n.id, handleId),
                }),
              },
            },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, somenteLeitura, chatbot.type],
  );

  const montarGraph = () => ({
    // `nodes` (não `nodesComCallbacks`) - o `onRemove` só existe na cópia
    // derivada para o React Flow, nunca no state base.
    nodes: nodes.map((n) => ({ id: n.id, type: n.type ?? '', position: n.position, data: n.data })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? null,
      target: e.target,
      targetHandle: e.targetHandle ?? null,
    })),
    viewport: viewportRef.current,
  });

  const salvarFluxo = async () => {
    if (somenteLeitura) return;
    try {
      setLoading(true);

      const salvo = await FetchReq<ChatbotFlowVersionResponse>({ endpoint: 'SalvarFluxoChatbot', variables: [chatbotId], body: montarGraph() });

      setDirty(false);
      setAlteracoesSalvasPendentes(salvo.has_unpublished_changes ?? emProducao);
      mostrarToast('Rascunho salvo com sucesso!');
    } catch (err) {
      CatchAlerta(err, 'Erro ao salvar o fluxo');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Publica congela o draft numa nova versão `published` - é só a partir
   * daqui que o motor de execução passa a enxergar o fluxo (ver
   * `findEntradaAtivoDoCanal` no backend). Salva antes, se houver alteração
   * pendente, para nunca publicar um estado mais velho que o que está na tela.
   */
  const publicarFluxo = async () => {
    if (!podePublicar || !ajustes.chatbot_habilitado || (dirty && !podeEditar)) return;
    try {
      setLoading(true);

      if (dirty) {
        const salvo = await FetchReq<ChatbotFlowVersionResponse>({ endpoint: 'SalvarFluxoChatbot', variables: [chatbotId], body: montarGraph() });
        setAlteracoesSalvasPendentes(salvo.has_unpublished_changes ?? emProducao);
        setDirty(false);
      }

      const chatbotPublicado = await FetchReq<ChatbotResponse>({
        endpoint: 'PublicarFluxoChatbot',
        variables: [chatbotId],
      });
      setVersaoPublicadaId(chatbotPublicado.current_published_version_id);
      setAlteracoesSalvasPendentes(false);

      mostrarToast('Fluxo publicado com sucesso!');
    } catch (err) {
      CatchAlerta(err, 'Erro ao publicar o fluxo');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Retira o fluxo de operação por escolha explícita, preservando o rascunho
   * e as execuções que já começaram na versão publicada.
   */
  const despublicarFluxo = async () => {
    if (!podePublicar || !ajustes.chatbot_habilitado) return;
    try {
      setLoading(true);
      const chatbotDespublicado = await FetchReq<ChatbotResponse>({
        endpoint: 'DespublicarFluxoChatbot',
        variables: [chatbotId],
      });
      setVersaoPublicadaId(chatbotDespublicado.current_published_version_id);
      setAlteracoesSalvasPendentes(false);
      mostrarToast('Fluxo despublicado. Novas conversas não iniciarão este fluxo.');
    } catch (err) {
      CatchAlerta(err, 'Erro ao despublicar o fluxo');
    } finally {
      setLoading(false);
    }
  };

  if (rendered && !ajustes.chatbot_habilitado) return <div>O módulo Chatbot está desabilitado nas configurações do sistema.</div>;

  return (
    rendered && (
      <div className="h-full flex flex-column" style={{ position: 'relative' }}>
        <div className="flex justify-content-between align-items-center mb-2">
          <div>
            <h3 className="m-0 ">Configurações ChatBot</h3>
            <span className="text-color-secondary text-sm">
              Crie e conecte cada etapa da jornada do cliente.
            </span>
          </div>
          <div className="flex align-items-center justify-content-end flex-wrap gap-2">
            <div className="text-sm text-color-secondary mr-2">
              <LabelPlus text={emProducao ? 'Versão publicada em uso' : 'Sem versão publicada'}
                textHelp="Você edita o rascunho. Salvar não altera a versão em uso. Publicar alterações aplica a nova versão às próximas conversas; as já iniciadas continuam na versão anterior." />
              {dirty ? <span className="text-orange-500">Alterações não salvas</span>
                : emProducao && alteracoesSalvasPendentes && <span className="text-orange-500">Rascunho com alterações para publicar</span>}
            </div>
            <Button label="Salvar rascunho" outlined disabled={!dirty || somenteLeitura} onClick={salvarFluxo} />
            <Button label={emProducao ? 'Publicar alterações' : podeEditar ? 'Salvar e Publicar' : 'Publicar'}
              disabled={!podePublicar || !ajustes.chatbot_habilitado || emProducao && !dirty && !alteracoesSalvasPendentes}
              onClick={publicarFluxo} />
            {emProducao && (
              <Button
                label="Despublicar"
                disabled={!podePublicar || !ajustes.chatbot_habilitado}
                severity="danger"
                outlined
                onClick={() => ConfirmaAcao(
                  'O fluxo deixará de iniciar novas conversas. O rascunho e as conversas já em andamento serão preservados.',
                  despublicarFluxo, undefined, 'Despublicar fluxo?', 'Despublicar', 'Cancelar',
                )}
              />
            )}
          </div>
        </div>

        <div
          className="border-round-bottom-lg border-1 border-300 overflow-hidden flex flex-1"
          // Estica até a borda do `.card` (que reserva 2rem de padding) só
          // nesta área - o header acima mantém o respiro normal.
          style={{ position: 'relative', minHeight: 0, margin: '0 -2rem -2rem -2rem' }}
        >
          {!somenteLeitura && <NodePalette onAddNode={adicionarNo} />}
          <div ref={wrapperRef} className="flex-1" style={{ position: 'relative', minWidth: 0, minHeight: 0 }}>
          <ReactFlow
            nodes={nodesComCallbacks}
            edges={edges}
            defaultEdgeOptions={OPCOES_LIGACAO}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={NODE_TYPES}
            colorMode={colorMode}
            nodesDraggable={!somenteLeitura}
            nodesConnectable={!somenteLeitura}
            elementsSelectable={!somenteLeitura}
            // Não `fitView`: o auto-ajuste recentraliza os nós a cada
            // abertura, ignorando onde o usuário deixou o canvas. Usa a
            // posição salva junto do fluxo (`viewportInicial`), ou o padrão
            // fixo se o fluxo nunca foi salvo com esse campo.
            defaultViewport={viewportInicial}
            proOptions={{ hideAttribution: true }}
          >
            {/* No tema claro o padrão do React Flow é branco puro, sem
                contraste com os nós (também brancos); um cinza suave resolve.
                No escuro/dim, o `colorMode` já cuida do fundo certo sozinho. */}
            <Background color={colorMode === 'light' ? '#f4f4f5' : undefined} />
            <ControlesDoCanvas />
            <SoltarNoNoCanvas wrapperRef={wrapperRef} onDropNode={adicionarNo} />
            <RastrearViewport viewportRef={viewportRef} />
          </ReactFlow>
          </div>
        </div>

        <NodeConfigDrawer
          node={nodeSelecionado}
          onHide={() => setNodeSelecionado(null)}
          onChange={atualizarDadosDoNo}
          onRemoveOutput={removerSaida}
        />
      </div>
    )
  );
}

/**
 * Substitui os botões padrão do `Controls` (zoom in, zoom out, ajustar,
 * cadeado) por só 3, na ordem e com os rótulos que o usuário pediu - sem o
 * cadeado de travar interatividade. O painel continua único e agrupado (como
 * o padrão do React Flow); o padding é em cada `ControlButton`, não no
 * painel. `useReactFlow` só funciona dentro da árvore do `<ReactFlow>`
 * (children ou um `ReactFlowProvider`), daí este componente à parte em vez de
 * chamá-lo direto no `FlowEditor`.
 */
function ControlesDoCanvas() {
  const { zoomIn, zoomOut, setViewport } = useReactFlow();

  return (
    <Controls
      showZoom={false}
      showFitView={false}
      showInteractive={false}
      style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--primary-500)' }}
    >
      <ControlButton
        style={{ height: '34px', width: '32px' }}
        onClick={() => zoomIn()}
        title="Aumentar zoom"
      >
        <i
          className={PrimeIcons.PLUS}
          style={{ color: 'var(--primary-color)' }}
        />
      </ControlButton>
      <ControlButton
        style={{ height: '34px', width: '32px' }}
        // Não é `fitView()` - ele recalcula zoom/posição para caber todos os
        // nós na tela, o que deixa o canvas mais "zoomado" e descentralizado
        // do que o padrão. Este botão restaura o mesmo `defaultViewport` fixo
        // com que o editor abre.
        onClick={() => setViewport(VIEWPORT_PADRAO, { duration: 300 })}
        title="Restaurar visualização"
      >
        <i
          className={PrimeIcons.WINDOW_MAXIMIZE}
          style={{ color: 'var(--primary-color)' }}
        />
      </ControlButton>
      <ControlButton
        style={{ height: '34px', width: '32px' }}
        onClick={() => zoomOut()}
        title="Diminuir zoom"
      >
        <i
          className={PrimeIcons.MINUS}
          style={{ color: 'var(--primary-color)' }}
        />
      </ControlButton>
    </Controls>
  );
}

/**
 * Sem UI própria - só liga o drop (item arrastado do `NodePalette`) à posição
 * real do canvas. `screenToFlowPosition` exige `useReactFlow()`, que só
 * funciona dentro da árvore do `<ReactFlow>` (mesma razão do
 * `ControlesDoCanvas`); os listeners vão no wrapper externo (via ref), porque
 * é ele que recebe o evento nativo de drop do navegador, não um elemento do
 * SVG interno do React Flow.
 */
function SoltarNoNoCanvas({
  wrapperRef,
  onDropNode,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onDropNode: (type: string, position: { x: number; y: number }) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer?.getData('application/chatbot-node-type');
      if (!type) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onDropNode(type, position);
    };

    el.addEventListener('dragover', onDragOver);
    el.addEventListener('drop', onDrop);

    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('drop', onDrop);
    };
  }, [wrapperRef, screenToFlowPosition, onDropNode]);

  return null;
}

/**
 * Sem UI própria - mantém `viewportRef` (lida só no `salvarFluxo`) sincronizada
 * com o pan/zoom atual do canvas. `useOnViewportChange` também exige estar
 * dentro da árvore do `<ReactFlow>`, mesma razão dos outros componentes
 * auxiliares deste arquivo.
 */
function RastrearViewport({ viewportRef }: { viewportRef: React.RefObject<ChatbotFlowViewport> }) {
  useOnViewportChange({
    onChange: (viewport) => {
      viewportRef.current = viewport;
    },
  });

  return null;
}

export default FlowEditor;
