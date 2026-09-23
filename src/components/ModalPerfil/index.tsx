'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog as Modal } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { TabPanel, TabView } from 'primereact/tabview';

import SeletorTema from '@/components/SeletorTema';
import { useCatalogoPreferencias } from '@/hooks/usePreferencias';
import { useTema } from '@/hooks/useTema';
import { IUsuariosResponse } from '@/Interfaces';
import { getUserInfo } from '@/actions/userInfo';
import useApi from '@/service/Api/ApiClient';
import { Alerta, CatchAlerta } from '@/service/Util';
import AbaDados from './AbaDados';
import AbaNotificacoes from './AbaNotificacoes';

type Props = {
  visible: boolean;
  onHide: () => void;
};

/**
 * O perfil do próprio usuário.
 *
 * ⚠️ **Não é o `ModalFormUser`.** Aquele é o cadastro administrativo - grupo de
 * permissão, status, editar terceiros - e exige `user:update`. Este é
 * auto-edição, exige `user:profile_update`, e reúne o que é da pessoa: seus
 * dados, sua aparência, seus avisos. Eram o mesmo formulário, e a distinção
 * vivia em condicionais espalhadas pelos campos.
 *
 * Primeiras abas do projeto. Foram escolhidas em vez de seções empilhadas
 * porque os três assuntos não se relacionam: quem vem trocar a cor não precisa
 * rolar por cima do formulário de senha.
 */
const ModalPerfil = ({ visible, onHide }: Props) => {
  const { FetchReq } = useApi();
  const { cor, modo, salvando, previsualizar, salvar, descartar } = useTema();

  // Derivado, não vem do hook: `dim` e `escuro` usam a mesma paleta escura.
  const escuro = modo !== 'claro';
  const { itens, carregando, recarregar } = useCatalogoPreferencias();

  const [perfil, setPerfil] = useState<IUsuariosResponse | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState(0);

  // O ponto de partida do tema, para saber se houve mudança e para o "Desfazer"
  // ter para onde voltar. O preview aplica na hora, sem gravar.
  const [corInicial, setCorInicial] = useState(cor);
  const [modoInicial, setModoInicial] = useState(modo);
  const temaMudou = cor !== corInicial || modo !== modoInicial;

  const carregarPerfil = async () => {
    try {
      setCarregandoPerfil(true);
      setPerfil(await FetchReq<IUsuariosResponse>('MeuPerfil'));
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível carregar seu perfil');
    } finally {
      setCarregandoPerfil(false);
    }
  };

  useEffect(() => {
    if (!visible) return;

    carregarPerfil();
    setCorInicial(cor);
    setModoInicial(modo);
    setAbaAtiva(0);
    // Só ao abrir: incluir `cor` faria o ponto de partida acompanhar o preview,
    // e o "Desfazer" nunca teria para onde voltar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /** Fechar sem aplicar desfaz o preview: experimentar não é decidir. */
  const fechar = () => {
    if (temaMudou) descartar();
    onHide();
  };

  const aplicarTema = async () => {
    try {
      await salvar(cor, modo);
      setCorInicial(cor);
      setModoInicial(modo);
      Alerta('Tema aplicado', '', 'success');
    } catch (erro) {
      CatchAlerta(erro, 'Não foi possível salvar o tema');
    }
  };

  /** O cookie `userInfo` carrega as preferências; sem recarregar, elas só
   *  valeriam no próximo login. */
  const aoSalvarPreferencia = async () => {
    await getUserInfo();
    recarregar();
  };

  return (
    <Modal
      modal
      visible={visible}
      onHide={fechar}
      header="Meu perfil"
      style={{ width: '54rem' }}
      breakpoints={{ '960px': '95vw' }}
      // Sem `p-fluid` no modal: ele estica todo botão, e as abas têm botões
      // que precisam do tamanho natural. Quem precisa dele o declara dentro.
    >
      <TabView
        activeIndex={abaAtiva}
        onTabChange={(e) => setAbaAtiva(e.index)}
      >
        <TabPanel
          header="Dados"
          leftIcon="fa-regular fa-user mr-2"
        >
          {carregandoPerfil || !perfil ? (
            <div className="flex justify-content-center p-5">
              <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} />
            </div>
          ) : (
            <AbaDados
              perfil={perfil}
              onSalvo={async () => {
                await getUserInfo();
                carregarPerfil();
              }}
            />
          )}
        </TabPanel>

        <TabPanel
          header="Aparência"
          leftIcon="fa-regular fa-palette mr-2"
        >
          <p className="mt-0 mb-4 text-color-secondary">
            As mudanças aparecem na hora. Feche sem aplicar para voltar ao tema atual.
          </p>

          <SeletorTema
            cor={cor}
            modo={modo}
            escuro={escuro}
            onEscolher={previsualizar}
          />

          <div className="flex justify-content-end mt-3">
            <Button
              label="Aplicar tema"
              icon="fa-regular fa-check"
              loading={salvando}
              disabled={!temaMudou}
              onClick={aplicarTema}
              style={{ width: 'auto' }}
            />
          </div>
        </TabPanel>

        <TabPanel
          header="Notificações"
          leftIcon="fa-regular fa-bell mr-2"
        >
          <AbaNotificacoes
            itens={itens}
            carregando={carregando}
            onSalvo={aoSalvarPreferencia}
          />
        </TabPanel>
      </TabView>
    </Modal>
  );
};

export default ModalPerfil;
