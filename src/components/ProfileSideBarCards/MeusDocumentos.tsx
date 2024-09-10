import { IMeusDocumentos } from 'Interfaces';
import { DateToBR } from 'service/Util';

const MeusDocumentos = ({ value }: { value: IMeusDocumentos }) => {
  return (
    <div className="py-2">
      <table className="tablePerfil w-full text-sm mb-5">
        <tbody>
          <tr>
            <td>Número documento</td>
            <td>{value?.documentoNumero}</td>
          </tr>
          <tr>
            <td>Tipo</td>
            <td>{value?.documentoTipo}</td>
          </tr>
          <tr>
            <td>Orgão expedidor</td>
            <td>{value?.documentoExpedidor}</td>
          </tr>
          <tr>
            <td>Data Expedição</td>
            <td>
              {value?.documentoExpedicao === ''
                ? '00/00/0000'
                : DateToBR(value?.documentoExpedicao)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default MeusDocumentos;
