'use client';

import { memo, useState } from 'react';
import { InputText } from 'primereact/inputtext';

import ChipFiltro from '@/components/ChipFiltro';
import { ResultadoBuscaCliente } from '@/Interfaces';
import useApi from '@/service/Api/ApiClient';
import { CatchAlerta } from '@/service/Util';

type Props = {
  valor: ResultadoBuscaCliente | null;
  onEscolher: (resultado: ResultadoBuscaCliente | null) => void;
};

/**
 * Busca de cliente ou contato - o ponto de entrada do relatório analítico.
 *
 * Mesmo `ChipFiltro` dos demais filtros da tela, por padronização: o campo de
 * texto e os resultados ficam dentro do painel, que só abre ao clicar -
 * antes era um `AutoComplete` solto, maior que os outros chips e destoando
 * do resto da barra.
 *
 * Clientes e contatos aparecem juntos na mesma lista, diferenciados por uma
 * tag: é a mesma busca de duas tabelas distintas, e separar em dois campos
 * obrigaria quem procura a já saber de antemão se o que tem em mãos é uma
 * conta cadastrada ou só o número de WhatsApp.
 */
const BuscaCliente = ({ valor, onEscolher }: Props) => {
  const { req } = useApi();
  const [termo, setTermo] = useState('');
  const [sugestoes, setSugestoes] = useState<ResultadoBuscaCliente[]>([]);
  const [buscando, setBuscando] = useState(false);

  const buscar = async (texto: string) => {
    setTermo(texto);

    // O backend já recusa menos de 2 caracteres (`ClientSearchDto`), mas
    // evitar a chamada aqui poupa uma requisição que só voltaria com erro de
    // validação, sem benefício nenhum para quem está digitando.
    if (texto.trim().length < 2) {
      setSugestoes([]);
      return;
    }

    try {
      setBuscando(true);
      const { data } = await req.get<ResultadoBuscaCliente[]>(
        `/reports/client-detail/search?termo=${encodeURIComponent(texto.trim())}`,
      );
      setSugestoes(data);
    } catch (err) {
      CatchAlerta(err, 'Erro ao buscar cliente ou contato');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <ChipFiltro
      rotulo="Cliente/Contato"
      valor={valor?.nome ?? 'Nenhum'}
      icone="pi pi-search"
      ativo={Boolean(valor)}
      larguraDoPainel="20rem"
    >
      {(fechar) => (
        <div className="flex flex-column gap-2 p-2">
          <span className="p-input-icon-right">
            {buscando && <i className="pi pi-spin pi-spinner" />}
            <InputText
              value={termo}
              onChange={(e) => buscar(e.target.value)}
              placeholder="Buscar cliente ou contato..."
              className="w-full p-inputtext-sm"
              autoFocus
            />
          </span>

          <ul className="list-none m-0 p-0 overflow-y-auto" style={{ maxHeight: '15rem' }}>
            {sugestoes.length === 0 && termo.trim().length >= 2 && !buscando && (
              <li className="text-sm text-color-secondary p-2">Nada encontrado</li>
            )}

            {sugestoes.map((item) => (
              <li key={`${item.tipo}-${item.id}`}>
                <button
                  type="button"
                  className="flex align-items-center justify-content-between gap-3 w-full p-2 border-none bg-transparent text-left cursor-pointer border-round hover:surface-hover"
                  onClick={() => {
                    onEscolher(item);
                    setTermo('');
                    setSugestoes([]);
                    fechar();
                  }}
                >
                  <span className="text-color">{item.nome}</span>
                  <span
                    className={`text-xs border-round px-2 py-1 white-space-nowrap ${
                      item.tipo === 'client'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {item.tipo === 'client' ? 'Cliente' : 'Contato'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChipFiltro>
  );
};

export default memo(BuscaCliente);
