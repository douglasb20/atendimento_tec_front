import { IContatos } from 'Interfaces';
import { Divider } from 'primereact/divider';
import { AjustaTelefone } from 'service/Util';

const EnderecoComercial = ({ value }: { value: IContatos }) => {
  return (
    <div className="py-2">
      <table className="tablePerfil w-full text-sm">
        <tbody>
          <tr>
            <td>UF</td>
            <td>{value?.uf}</td>
          </tr>
          <tr>
            <td>Cidade</td>
            <td>{value?.cidade}</td>
          </tr>
          <tr>
            <td>Bairro</td>
            <td>{value?.bairro}</td>
          </tr>
          <tr>
            <td>Logradouro</td>
            <td>{value?.endereco}</td>
          </tr>
          <tr>
            <td>Complemento</td>
            <td>{value?.complemento}</td>
          </tr>
          <tr>
            <td>Cep</td>
            <td>{value?.cep}</td>
          </tr>
          <tr>
            <td
              className="divider"
              colSpan={2}
            >
              <Divider />{' '}
            </td>
          </tr>
          <tr>
            <td>Telefone</td>
            <td>{AjustaTelefone(value?.telefone1)}</td>
          </tr>
          <tr>
            <td>Email</td>
            <td>{value?.proponenteEmail}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default EnderecoComercial;
