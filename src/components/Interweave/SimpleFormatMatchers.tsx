// @ts-nocheck
import React from 'react';
import { Matcher } from 'interweave';
import { UrlMatcher } from 'interweave-autolink';

/**
 * Os delimitadores de formatação do WhatsApp - nenhum deles é um caractere
 * válido de usuário/senha numa URL de verdade.
 */
const DELIMITADORES_FORMATACAO = ['*', '_', '~', '`'];

/**
 * `UrlMatcher` do `interweave-autolink` corrigido para não engolir o `*` de
 * abertura de um negrito.
 *
 * A regex de URL da lib aceita `*` como parte do "auth" de uma URL (sintaxe
 * `scheme://usuario@host`), então um e-mail dentro de `*negrito*` (ex.:
 * `*fulano@gmail.com*`) faz o match da URL incluir o `*` de abertura -
 * `EMAIL_DISTINCT_PATTERN` não pega esse caso porque o match deixa de ser um
 * e-mail "puro". O `UrlMatcher` roda antes do matcher de negrito (ver
 * `globalMatchers` abaixo), então esse `*` comido nunca chega ao
 * `SimpleBoldMatcher` - o parser do Interweave perde o par de delimitadores e
 * quebra com "Closing token missing for interpolated element", tanto em
 * mensagens avulsas quanto na prévia da lista de conversas.
 */
export class SafeUrlMatcher extends UrlMatcher {
  match(string) {
    const response = super.match(string);
    if (!response) return response;

    if (DELIMITADORES_FORMATACAO.some((del) => response.match.startsWith(del))) {
      return null;
    }

    return response;
  }
}

// Base class for several Interweave matchers used for simple formatting
export class SimpleFormatMatcher extends Matcher {
  match(string) {
    return this.doMatch(string, this.regexp(), (matches) => ({
      start: matches[1],
      end: matches[2],
    }));
  }

  replaceWith(children, props) {
    const size = Math.min(props.start.length, props.end.length);

    // O Interweave devolve um array de nós, e cada elemento criado aqui é um
    // item dessa lista. O `props.key` nem sempre vem preenchido - e sem ele o
    // React avisa a cada mensagem formatada, que no chat é praticamente toda
    // uma, já que o texto começa com `*Nome:*`. O índice do match serve como
    // identidade estável dentro da mesma string.
    const chave = props.key ?? `fmt-${this.element()}-${props.index ?? 0}`;

    return React.createElement(this.element(), { key: chave }, this.trim(children, size));
  }

  asTag() {
    return this.element();
  }

  regexp() {
    const del = this.delimiter();
    return RegExp(`(${del}+)[^${del}]+(${del}+)`);
  }

  trim(children, size) {
    if (typeof children === 'string') {
      return children.slice(size, children.length - size);
    } else {
      return React.Children.map(children, (child, i) => {
        if (i === 0) return child.slice(size);

        if (i === children.length - 1) return child.slice(0, child.length - size);

        return child;
      });
    }
  }
}

// Custom Interweave matcher to render bold text
export class SimpleBoldMatcher extends SimpleFormatMatcher {
  delimiter() {
    return '\\*';
  }

  element() {
    return 'b';
  }
}

// Custom Interweave matcher to render italic text
export class SimpleItalicMatcher extends SimpleFormatMatcher {
  delimiter() {
    return '_';
  }

  element() {
    return 'i';
  }
}

// Custom Interweave matcher to render strikethrough text
export class SimpleStrikeMatcher extends SimpleFormatMatcher {
  delimiter() {
    return '~';
  }

  element() {
    return 's';
  }
}

// Custom Interweave matcher to render code snippets
export class SimpleCodeMatcher extends SimpleFormatMatcher {
  delimiter() {
    return '`';
  }

  element() {
    return 'code';
  }
}
