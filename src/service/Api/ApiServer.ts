import axios from 'axios';
import { cookies } from 'next/headers';

const url = process.env.URL_ENDPOINT;
const subUrl = '/assinatura/portal';
const id_parceria = 'u9ZB5aMc6bXHcncOblCK';

export default function ApiServer() {
  const cookiesStore = cookies();
  const token = cookiesStore.get('token')?.value;

  const req = axios.create({
    baseURL: url,
    headers: { Authorization: 'Bearer ' + token },
  });

  return {
    req,
    baseUrl: url,
    token: token,

    Proposta: `${subUrl}/proposta`, // Post
    CanalDist: `${subUrl}/corretor/{{cpf}}`, // Get
    Campanha: `${subUrl}/campanha/${id_parceria}/{{idCanalDistribuicao}}`, // Get
    MeioPagamentos: `${subUrl}/meios-pagamento/${id_parceria}`, // Get
    ConsultaPropostas: `${subUrl}/corretor/follow-up/${id_parceria}?dtInicio={{dataInicio}}&dtFim={{dataFim}}&status={{idStatus}}`,
    ReenvioLink: `${subUrl}/proposta/reenvia-sms-link/${id_parceria}?idProposta={{idProposta}}`, // Post
    ReenvioToken: `${subUrl}/proposta/reenvia-sms-token/${id_parceria}?idProposta={{idProposta}}`, // Post
    ChangePassword: `/acesso/${id_parceria}/corretor/trocasenha`, // Put

    Paises: `${subUrl}/paises`, // Get
  };
}
