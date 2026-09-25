/**
 * Chatbot por fluxo visual. Espelha `back/src/chatbots/`.
 *
 * `type = 'complementar'`: os fluxos complementares (subfluxos, chamados pelo
 * nó "Executar Fluxo") - mesma entidade, sem canal, compartilháveis entre
 * qualquer chatbot do sistema.
 */
export type ChatbotType = 'entrada' | 'saida' | 'agendamento' | 'complementar';

export type ChatbotResponse = {
  id: number;
  name: string;
  type: ChatbotType;
  active: boolean;
  channel_id: number | null;
  channel?: { id: number; name: string } | null;
  settings: Record<string, unknown>;
  current_published_version_id: number | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

/** Um nó do grafo do fluxo (React Flow), com config específica por tipo em `data`. */
export type ChatbotFlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
};

/** Uma ligação entre nós, endereçada por saída nomeada (`sourceHandle`). */
export type ChatbotFlowEdge = {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
};

/** Posição/zoom do canvas - opcional, ausente em fluxos salvos antes deste campo existir. */
export type ChatbotFlowViewport = { x: number; y: number; zoom: number };

export type ChatbotFlowVersionResponse = {
  id: number;
  chatbot_id: number;
  status: 'draft' | 'published' | 'archived';
  graph: { nodes: ChatbotFlowNode[]; edges: ChatbotFlowEdge[]; viewport?: ChatbotFlowViewport };
  version_number: number;
  published_at: string | null;
  created_at: string;
};

/**
 * O shape de `ChatbotFlowNode.data` quando `type === 'message'` - documentado
 * aqui, mas não imposto na interface geral (`data` continua solto, cada tipo
 * de nó valida o próprio shape em `nodeTypes/`). Espelha
 * `back/src/chatbot-engine/node-handlers/message.handler.ts`.
 */
export type ChatbotMessageType = 'text' | 'image' | 'audio' | 'video' | 'voice' | 'document';

export type ChatbotMessageNodeData = {
  messageType: ChatbotMessageType;
  value: string; // texto (sempre) ou legenda (quando messageType !== 'text')
  attachmentSource?: 'upload' | 'variable';
  attachmentKey?: string;
  attachmentFileName?: string;
  attachmentMimetype?: string;
  attachmentVariable?: string;
  continueOn: 'auto' | 'after_reply';
};
