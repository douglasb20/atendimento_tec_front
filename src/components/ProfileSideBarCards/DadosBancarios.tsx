import { IInformacaoBancaria } from 'Interfaces';
import BancosJSON from 'assets/data/Bancos.json';

const DadosBancarios = ({ value }: { value: IInformacaoBancaria }) => {
  return (
    <div className="py-2">
      <table className="tablePerfil w-full text-sm">
        <tbody>
          <tr>
            <td>Banco</td>
            <td>{BancosJSON[value?.bancoCodigo]}</td>
          </tr>
          <tr>
            <td>Agência</td>
            <td>{value?.agencia}</td>
          </tr>
          <tr>
            <td>Conta</td>
            <td>{value?.conta + (value?.conta !== '' ? '-' + value?.digConta : '')}</td>
          </tr>
          <tr>
            <td>Tipo de conta</td>
            <td>{value?.tipoConta}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default DadosBancarios;
