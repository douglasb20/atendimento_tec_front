import { Divider } from 'primereact/divider';

import { IParticipanteDados } from 'Interfaces';
import { DateToBR, UcWords, mask } from 'service/Util';
import { SelSexo } from 'components/DropdownItems';

const DadosParticipante = ({ value }: { value: IParticipanteDados }) => {
  return (
    <div className="py-2">
      <table className="tablePerfil w-full text-sm mb-5">
        <tbody>
          <tr>
            <td>Nome</td>
            <td>{value?.nome && UcWords(value?.nome)}</td>
          </tr>
          <tr>
            <td>CPF</td>
            <td>{value?.cpf && mask(value?.cpf, '###.###.###-##')}</td>
          </tr>
          <tr>
            <td>Sexo</td>
            <td>{value?.sexo && SelSexo.find((e) => e.value === value?.sexo).label}</td>
          </tr>
          <tr>
            <td>Nascimento</td>
            <td>{value?.dataNascimento && DateToBR(value.dataNascimento)}</td>
          </tr>
          <tr>
            <td>Naturalidade</td>
            <td>{value?.naturalidade}</td>
          </tr>
          <tr>
            <td>Nacionalidade</td>
            <td>{value?.nacionalidade}</td>
          </tr>
          <tr>
            <td>Estado civil</td>
            <td>{value?.estadoCivil}</td>
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
            <td>Filial 1</td>
            <td>{value?.filiacao1 ? value.filiacao1 : 'Não informado'}</td>
          </tr>
          <tr>
            <td>Filial 2</td>
            <td>{value?.filiacao2 ? value.filiacao2 : 'Não informado'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default DadosParticipante;
