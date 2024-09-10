import React, { useContext, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Divider } from 'primereact/divider';
import { Button } from 'primereact/button';

import { IBeneficiarios } from 'Interfaces';
import { useService } from 'contexts/ServicesContext';
import ParentescosJSON from 'assets/data/Parentescos.json';
import { LayoutContext } from 'layout/context/layoutcontext';
import { DateToBR, ConfirmaAcao, AjeitaUrl, CatchAlerta } from 'service/Util';
import ApiClient from 'service/Api/ApiClient';

const Beneficiarios = ({ value }: { value: IBeneficiarios[] }) => {
  const { setLayoutState } = useContext(LayoutContext);
  const { req, ...Api } = ApiClient();
  const { setLoading } = useService();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const params = useParams();
  const ativa = JSON.parse(localStorage.getItem('participacaoAtiva'));

  const onProfileSidebarHide = () => {
    setLayoutState((prevState) => ({ ...prevState, profileSidebarVisible: false }));
    const body = document.body;
    body.classList.remove('overflow-hidden');
  };

  const RemoveBeneficiario = async (id: number) => {
    try {
      setLoading(true);
      onProfileSidebarHide();
      await req.delete(AjeitaUrl(Api.RemoverBeneficiario, [id]));
      const { data: principal } = await req.get(AjeitaUrl(Api.Principal, [ativa.id]));
      localStorage.setItem('principal', JSON.stringify(principal));
      setLayoutState((prevState) => ({
        ...prevState,
        changeProfile: Math.floor(new Date().getTime() / 1000),
      }));

      if ('category' in params) {
        const category = params['category'];
        if (+category?.[1] === id) {
          startTransition(() => {
            router.push(`/dashboard`);
          });
        }
      }
    } catch (error) {
      CatchAlerta(error, 'Erro ao salvar meus documentos');
    } finally {
      setLoading(false);
    }
  };

  console.log(isPending);

  return (
    <div className="py-2">
      <table className="tablePerfil w-full text-sm">
        <tbody>
          {Array.from(value).map((beneficiario, key) => {
            let showDivider = key > 0;
            return (
              <React.Fragment key={key}>
                <tr hidden={!showDivider}>
                  <td
                    className="divider"
                    colSpan={2}
                  >
                    <Divider />{' '}
                  </td>
                </tr>
                <tr>
                  <td>Nome</td>
                  <td>{beneficiario?.nome}</td>
                </tr>
                <tr>
                  <td>Nascimento</td>
                  <td>{DateToBR(beneficiario?.nascimento)}</td>
                </tr>
                <tr>
                  <td>Parentesco</td>
                  <td>{ParentescosJSON[beneficiario?.grauAfinidade]}</td>
                </tr>
                <tr>
                  <td>Participação</td>
                  <td>{beneficiario?.percentualParticipacao.toFixed(2)}%</td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <div className="w-100 flex flex-row justify-content-between">
                      <Button
                        className="p-button-outlined p-button-danger"
                        icon="pi pi-trash"
                        onClick={() =>
                          ConfirmaAcao(
                            'Confirma excluir este beneficiário?',
                            RemoveBeneficiario,
                            beneficiario.id,
                          )
                        }
                      />
                      <Button
                        className=""
                        icon="pi pi-user-edit"
                        onClick={() => {
                          onProfileSidebarHide();
                          router.push(`/form_profile/beneficiario/${beneficiario.id}`);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Beneficiarios;
