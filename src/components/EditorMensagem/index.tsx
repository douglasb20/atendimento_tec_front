'use client';

import dynamic from 'next/dynamic';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react';
import { createPortal } from 'react-dom';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { InputTextarea } from 'primereact/inputtextarea';
import { useRef, useState } from 'react';

import Interweave from '@/components/Interweave';
import { aplicaExemplos, GRUPOS_VARIAVEIS, VARIAVEIS_MENSAGEM } from './variaveis';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

type EditorMensagemProps = {
  id?: string;
  value: string;
  onChange: (texto: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  /** A pré-visualização ocupa espaço; nem todo formulário a quer. */
  comPreVisualizacao?: boolean;
  /** Fora das mensagens automáticas não há o que substituir. */
  comVariaveis?: boolean;
  disabled?: boolean;
};

/**
 * Formatação que o WhatsApp entende, e só ela.
 *
 * Não é editor de texto rico: o WhatsApp recebe texto puro, e o que chamamos de
 * negrito é o par de asteriscos em volta da palavra. Cada botão aqui envolve a
 * seleção com o marcador correspondente - é o mesmo que o atendente faria à
 * mão, com menos chance de errar o par.
 *
 * ⚠️ **Sem sublinhado.** A barra da referência tinha um, mas o WhatsApp não
 * suporta: oferecê-lo produziria uma formatação que nunca chega ao cliente.
 *
 * A pré-visualização reusa o mesmo `Interweave` das bolhas da conversa, então o
 * que aparece aqui é literalmente o que o contato vai ver - não uma imitação
 * que pode divergir com o tempo.
 */

/** Marcadores aceitos pelo WhatsApp, na ordem em que aparecem na barra. */
const FORMATOS = [
  { marcador: '*', icone: 'fa-solid fa-bold', titulo: 'Negrito' },
  { marcador: '_', icone: 'fa-solid fa-italic', titulo: 'Itálico' },
  { marcador: '~', icone: 'fa-solid fa-strikethrough', titulo: 'Tachado' },
  { marcador: '`', icone: 'fa-solid fa-code', titulo: 'Monoespaçado' },
];

const EditorMensagem = ({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength = 1000,
  comPreVisualizacao = false,
  comVariaveis = true,
  disabled = false,
}: EditorMensagemProps) => {
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const menuVariaveisRef = useRef<Menu>(null);
  const [emojiAberto, setEmojiAberto] = useState(false);

  // O picker vai para um portal no `body`: dentro do contêiner do editor ele
  // era cortado pelo `overflow: hidden` que arredonda a caixa, e ainda ficava
  // preso ao empilhamento do diálogo. O `floating-ui` cuida de virá-lo para
  // cima ou para baixo conforme o espaço na tela.
  const { refs, floatingStyles } = useFloating({
    open: emojiAberto,
    placement: 'bottom-start',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  /**
   * Escreve no ponto onde o cursor está e devolve o foco ao campo.
   *
   * O foco é o detalhe que faz a barra ser utilizável: sem ele, o clique no
   * botão tira o cursor do textarea e a formatação seguinte não teria onde se
   * aplicar - o atendente precisaria clicar no texto de novo a cada marcador.
   */
  const escreveNaSelecao = (antes: string, depois = '') => {
    const campo = campoRef.current;
    if (!campo) return;

    const inicio = campo.selectionStart ?? value.length;
    const fim = campo.selectionEnd ?? value.length;
    const selecionado = value.slice(inicio, fim);

    onChange(value.slice(0, inicio) + antes + selecionado + depois + value.slice(fim));

    // Depois do render: mexer na seleção antes dele seria desfeito pelo React.
    requestAnimationFrame(() => {
      campo.focus();
      // Com texto selecionado o cursor vai para depois do trecho formatado;
      // sem seleção, fica no meio do par, pronto para digitar.
      const posicao = selecionado
        ? inicio + antes.length + selecionado.length + depois.length
        : inicio + antes.length;
      campo.setSelectionRange(posicao, posicao);
    });
  };

  // Agrupado por origem do dado: uma lista plana de doze itens obriga a ler
  // tudo para achar "sobrenome do atendente" no meio das do contato.
  const itensVariaveis: MenuItem[] = GRUPOS_VARIAVEIS.map((grupo) => ({
    label: grupo,
    items: VARIAVEIS_MENSAGEM.filter((variavel) => variavel.grupo === grupo).map((variavel) => ({
      label: variavel.rotulo,
      command: () => escreveNaSelecao(`{{${variavel.chave}}}`),
    })),
  }));

  const botao = (
    icone: string,
    titulo: string,
    aoClicar: (evento: React.MouseEvent<HTMLButtonElement>) => void,
    ativo = false,
  ) => (
    <button
      type="button"
      key={titulo}
      title={titulo}
      aria-label={titulo}
      disabled={disabled}
      onClick={aoClicar}
      className={`flex align-items-center justify-content-center border-none border-round cursor-pointer ${
        ativo ? 'surface-200 text-900' : 'bg-transparent text-600'
      } hover:surface-200`}
      style={{ width: '2rem', height: '2rem' }}
    >
      <i className={`${icone} text-sm`} />
    </button>
  );

  return (
    <div className={comPreVisualizacao ? 'flex flex-column md:flex-row gap-3' : ''}>
      <div className="flex-1">
        <div className="border-1 border-round surface-border overflow-hidden">
          <InputTextarea
            id={id}
            ref={campoRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={disabled}
            autoResize
            // A borda é do contêiner, que envolve campo e barra como uma peça
            // só; a do campo criaria uma linha dupla no meio.
            className="border-none border-noround w-full"
            style={{ resize: 'none', boxShadow: 'none' }}
          />

          <div className="flex align-items-center gap-1 surface-50 border-top-1 surface-border px-2 py-1">
            {FORMATOS.map((formato) =>
              botao(formato.icone, formato.titulo, () =>
                escreveNaSelecao(formato.marcador, formato.marcador),
              ),
            )}

            <span
              className="surface-300 mx-1"
              style={{ width: 1, height: '1.25rem' }}
            />

            <span ref={refs.setReference}>
              {botao(
                'fa-regular fa-face-smile',
                'Emoji',
                () => setEmojiAberto((aberto) => !aberto),
                emojiAberto,
              )}
            </span>

            {comVariaveis && (
              <>
                <Menu
                  ref={menuVariaveisRef}
                  model={itensVariaveis}
                  popup
                  style={{ width: 'auto' }}
                  pt={{ label: { className: 'white-space-nowrap' } }}
                />
                {botao('fa-solid fa-brackets-curly', 'Inserir variável', (evento) =>
                  menuVariaveisRef.current?.toggle(evento),
                )}
              </>
            )}

            <small className="ml-auto text-500">
              {value.length}/{maxLength}
            </small>
          </div>
        </div>
      </div>

      {comPreVisualizacao && (
        <div
          className="flex-none"
          style={{ width: '18rem' }}
        >
          <span className="block mb-2 text-sm font-medium text-600">
            <i className="fa-regular fa-eye mr-2" />
            Pré-visualização
          </span>

          <div
            // ⚠️ Cores do tema, não as do WhatsApp: eu tinha cravado o bege
            // `#e5ddd5` e o branco da bolha para imitar o aplicativo, e no modo
            // escuro a pré-visualização ficava um retângulo claro. A ideia
            // continua sendo "parece o WhatsApp", mas dentro do tema escolhido.
            className="border-round-lg surface-100 p-3"
            style={{ minHeight: '6rem' }}
          >
            {value.trim() ? (
              <div
                className="border-round-lg surface-0 p-2 shadow-1 text-sm"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {/* O mesmo componente das bolhas da conversa: o que aparece
                    aqui é o que o contato vai ver, sem uma segunda
                    implementação para divergir. */}
                <Interweave content={aplicaExemplos(value)} />
              </div>
            ) : (
              <span className="text-sm text-500">A mensagem aparecerá aqui.</span>
            )}
          </div>

          {comVariaveis && (
            <small className="block mt-2 text-500">
              As variáveis aparecem preenchidas com exemplos; o valor real entra no ato do envio.
            </small>
          )}
        </div>
      )}

      {emojiAberto &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Fecha ao clicar fora. `mousedown` e não `click`: o clique no
                emoji dispara depois, e com `click` esta camada fecharia o
                picker antes de a escolha chegar. */}
            <div
              className="fixed top-0 left-0 w-full h-full"
              style={{ zIndex: 99998 }}
              onMouseDown={() => setEmojiAberto(false)}
            />
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 99999 }}
            >
              <EmojiPicker
                onEmojiClick={(dados: EmojiClickData) => {
                  escreveNaSelecao(dados.emoji);
                  setEmojiAberto(false);
                }}
                emojiStyle={EmojiStyle.NATIVE}
                theme={Theme.AUTO}
                searchPlaceHolder="Pesquisar"
                // A faixa de "What's your mood?" no rodapé ocupa espaço e não
                // serve aqui: quem escreve a saudação quer o emoji, não uma
                // prévia dele.
                previewConfig={{ showPreview: false }}
                width={320}
                height={380}
                // ⚠️ Sem seletor de tom de pele: o histórico de recentes da
                // biblioteca não distingue as variações, e escolher um tom
                // embaralha a lista de usados. O picker de reações do chat já
                // desliga pelo mesmo motivo.
                skinTonesDisabled
                lazyLoadEmojis
              />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default EditorMensagem;
