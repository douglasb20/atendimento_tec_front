export function parseMensagem(texto: string): React.ReactNode[] {
  if (!texto) return [];

  // Divide o texto em partes mantendo as marcações
  const tokens = texto.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`)/g);
  const elementos: React.ReactNode[] = [];

  tokens.forEach((token, i) => {
    if (!token) return;

    // 🟢 Negrito
    if (token.startsWith('*') && token.endsWith('*')) {
      const conteudo = token.slice(1, -1);
      elementos.push(<strong key={i}>{parseMensagem(conteudo)}</strong>);
    }
    // 🟣 Itálico
    else if (token.startsWith('_') && token.endsWith('_')) {
      const conteudo = token.slice(1, -1);
      elementos.push(<em key={i}>{parseMensagem(conteudo)}</em>);
    }
    // 🔴 Riscado
    else if (token.startsWith('~') && token.endsWith('~')) {
      const conteudo = token.slice(1, -1);
      elementos.push(<s key={i}>{parseMensagem(conteudo)}</s>);
    }
    // 🟠 Código
    else if (token.startsWith('`') && token.endsWith('`')) {
      const conteudo = token.slice(1, -1);
      elementos.push(
        <code
          key={i}
          className="bg-gray-200 px-1 rounded font-mono"
        >
          {conteudo}
        </code>,
      );
    }
    // Texto comum - preserva quebras de linha
    else {
      if (token.includes('\n')) {
        const linhas = token.split('\n');
        linhas.forEach((linha, lineIndex) => {
          elementos.push(<span key={`${i}-${lineIndex}`}>{linha}</span>);
          if (lineIndex < linhas.length - 1) {
            elementos.push(<br key={`${i}-br-${lineIndex}`} />);
          }
        });
      } else {
        // Envolver texto normal em span para preservar espaços
        elementos.push(<span key={i}>{token}</span>);
      }
    }
  });

  return elementos;
}