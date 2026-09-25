'use client';

import { parseCookies } from 'nookies';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { UserInfo } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import {
  aplicaTema,
  atualizaTemaNoUserInfo,
  COOKIE_TEMA,
  desserializaTema,
  gravaCookieTema,
  normalizaTema,
} from '@/service/Tema';

/**
 * A preferência de tema de quem está usando o sistema.
 *
 * Três lugares guardam a escolha, e cada um tem um papel:
 *
 * - **banco** (`users.tema`) - a fonte de verdade, que acompanha a pessoa em
 *   qualquer máquina;
 * - **cookie** - espelho lido pelo servidor, para o HTML já sair com o tema
 *   certo e não haver flash;
 * - **DOM** - o `<link>` efetivamente carregado.
 *
 * O cookie é o que o hook lê ao montar, porque é o mesmo valor que o servidor
 * usou: ler do `userInfo` aqui poderia divergir do que já está pintado e causar
 * uma troca visível à toa.
 */
/**
 * Se o tema do banco já foi conferido nesta aba.
 *
 * ⚠️ Fora do componente de propósito. O hook vive no `ModalTema`, que está
 * dentro do painel de perfil e **remonta toda vez que o painel abre**. Com o
 * controle no estado, cada montagem refazia a sincronização e reaplicava o
 * `userInfo` - que só é regravado a cada 30 minutos e por isso ainda trazia o
 * tema antigo. O efeito era o tema escolhido reverter ao abrir o menu.
 */
let sincronizado = false;

export const useTema = () => {
  const { FetchReq } = useApi();
  const [{ cor, modo }, setEscolha] = useState(() => desserializaTema(null));
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const cookies = parseCookies();
    const doCookie = desserializaTema(cookies[COOKIE_TEMA]);

    // Depois da primeira vez, o cookie de tema é a verdade corrente da aba:
    // ele é atualizado a cada `salvar`, enquanto o `userInfo` fica para trás.
    if (sincronizado) {
      setEscolha(doCookie);
      setCarregado(true);
      return;
    }
    sincronizado = true;

    // O banco vence o cookie: entrar noutra máquina tem de trazer o tema da
    // pessoa. Como o cookie já pintou a tela, a correção só acontece se de
    // fato divergirem - e aí o `aplicaTema` faz a troca sem piscar.
    let doBanco = doCookie;
    try {
      const cru = cookies['userInfo'];
      if (cru) {
        const info = JSON.parse(cru) as UserInfo;
        doBanco = normalizaTema(info.tema, info.modo_tema);
      }
    } catch {
      // Cookie corrompido: segue com o que o servidor já aplicou.
    }

    setEscolha(doBanco);
    setCarregado(true);

    if (doBanco.cor !== doCookie.cor || doBanco.modo !== doCookie.modo) {
      gravaCookieTema(doBanco.cor, doBanco.modo);
      void aplicaTema(doBanco.cor, doBanco.modo);
    }
  }, []);

  /**
   * Aplica na hora, sem gravar - é o preview enquanto a pessoa escolhe.
   *
   * Separado do `salvar` de propósito: ver a cor antes de confirmar é metade
   * da utilidade da tela, e gravar a cada clique encheria o banco de escolhas
   * que ninguém quis.
   */
  const previsualizar = useCallback(async (novaCor: string, novoModo: string) => {
    setEscolha({ cor: novaCor, modo: novoModo });
    await aplicaTema(novaCor, novoModo);
  }, []);

  /** Confirma a escolha: banco, cookie e DOM. */
  const salvar = useCallback(
    async (novaCor: string, novoModo: string) => {
      setSalvando(true);
      try {
        await FetchReq({
          endpoint: 'AtualizarPreferenciasTema',
          body: { tema: novaCor, modo_tema: novoModo },
        });

        gravaCookieTema(novaCor, novoModo);
        // O `userInfo` também: ele é lido na sincronização inicial e vence só
        // depois de 30 minutos. Sem atualizá-lo, a próxima aba (ou um F5 antes
        // de ele expirar) traria de volta o tema antigo.
        atualizaTemaNoUserInfo(novaCor, novoModo);
        setEscolha({ cor: novaCor, modo: novoModo });
        await aplicaTema(novaCor, novoModo);
      } finally {
        setSalvando(false);
      }
    },
    // `FetchReq` nasce a cada render do hook e entraria em laço aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Desfaz o preview, voltando ao que está gravado no cookie. */
  const descartar = useCallback(async () => {
    const gravado = desserializaTema(parseCookies()[COOKIE_TEMA]);
    setEscolha(gravado);
    await aplicaTema(gravado.cor, gravado.modo);
  }, []);

  return useMemo(
    () => ({ cor, modo, carregado, salvando, previsualizar, salvar, descartar }),
    [cor, modo, carregado, salvando, previsualizar, salvar, descartar],
  );
};
