'use client';

import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';
import { useRef } from 'react';

type AcoesAtendimentoProps = {
  aguardando: boolean;
  emAndamento: boolean;
  finalizado: boolean;
  processando: boolean;
  onIniciar: () => void;
  onFinalizar: () => void;
  onEditarContato: () => void;
};

/**
 * Ações do atendimento, que mudam conforme o estado.
 *
 * Aguardando mostra só "Iniciar": cadastrar contato ou finalizar antes de
 * alguém assumir não faz sentido - não há atendimento em curso.
 */
const AcoesAtendimento = ({
  aguardando,
  emAndamento,
  finalizado,
  processando,
  onIniciar,
  onFinalizar,
  onEditarContato,
}: AcoesAtendimentoProps) => {
  const menuRef = useRef<Menu>(null);

  const itensMenu: MenuItem[] = [
    {
      label: 'Cadastrar/editar contato',
      icon: 'fa-regular fa-user-pen',
      command: onEditarContato,
    },
  ];

  if (finalizado) {
    return (
      <span className="flex align-items-center gap-2 flex-none text-sm font-medium text-green-700 white-space-nowrap">
        <i className="fa-regular fa-circle-check" />
        Finalizado
      </span>
    );
  }

  return (
    <div className="flex align-items-center gap-2 flex-none">
      {aguardando && (
        <Button
          label="Iniciar atendimento"
          icon="fa-regular fa-play"
          onClick={onIniciar}
          loading={processando}
        />
      )}

      {emAndamento && (
        <>
          <Button
            label="Finalizar"
            icon="fa-regular fa-check"
            severity="success"
            outlined
            onClick={onFinalizar}
          />

          <Menu
            ref={menuRef}
            model={itensMenu}
            popupAlignment="right"
            popup
          />
          <Button
            icon="fa-regular fa-ellipsis-vertical"
            text
            rounded
            aria-label="Mais ações"
            onClick={(evento) => menuRef.current?.toggle(evento)}
          />
        </>
      )}
    </div>
  );
};

export default AcoesAtendimento;
