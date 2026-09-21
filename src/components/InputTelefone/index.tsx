'use client';

import { Dropdown } from 'primereact/dropdown';
import { classNames } from 'primereact/utils';
import PhoneInput, { getCountryCallingCode, type Country } from 'react-phone-number-input';
import Flags from 'react-phone-number-input/flags';
import ptBR from 'react-phone-number-input/locale/pt-BR.json';

/**
 * Telefone com seletor de país, no formato que o WhatsApp entende.
 *
 * O campo antigo usava máscara brasileira fixa, e o `55` do país acabava lido
 * como DDD: `556492698043` aparecia como `(55) 6492-6980`, com dois dígitos
 * perdidos. Aqui o país é escolhido à parte e o número nunca disputa espaço
 * com ele.
 *
 * O valor entra e sai em **E.164** (`+556492698043`) - o formato canônico, que
 * é o que vai para `contacts.phone` sem o `+`.
 *
 * O CSS da biblioteca não é importado, e o seletor nativo é substituído pelo
 * `Dropdown` do PrimeReact: assim a lista de países abre com a aparência do
 * resto do sistema, em vez do menu cru do navegador.
 */
type InputTelefoneProps = {
  id?: string;
  value?: string;
  onChange: (valor?: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalido?: boolean;
  placeholder?: string;
};

/**
 * O banco guarda só dígitos (`556492698043`); a biblioteca exige o `+`.
 *
 * Sem isto o país não é reconhecido e o campo abre no primeiro da lista, com o
 * número em branco.
 */
export const paraE164 = (valor?: string | null): string | undefined => {
  if (!valor) return undefined;
  const digitos = valor.replace(/\D/g, '');
  return digitos ? `+${digitos}` : undefined;
};

/** O caminho inverso: o que a API recebe é só dígito. */
export const somenteDigitos = (valor?: string | null): string => (valor ?? '').replace(/\D/g, '');

type OpcaoPais = { value?: Country; label: string };

type SeletorPaisProps = {
  value?: Country;
  options: OpcaoPais[];
  onChange: (valor?: Country) => void;
  disabled?: boolean;
};

/** Bandeira do país, do conjunto que a própria biblioteca traz. */
const Bandeira = ({ pais }: { pais?: Country }) => {
  const Icone = pais ? Flags[pais] : undefined;

  if (!Icone) return <i className="pi pi-globe text-500" />;

  return (
    <span
      className="flex align-items-center"
      style={{ width: '1.5rem' }}
    >
      <Icone title={pais} />
    </span>
  );
};

/**
 * Substitui o `<select>` nativo que a biblioteca usa por padrão.
 *
 * Ela passa `value`, `options` e `onChange`; o resto é aparência nossa. O
 * filtro entra porque são mais de duzentos países - rolar até "Brasil" numa
 * lista dessa é pior que digitar.
 */
/** "+55", quando o país é conhecido. */
const codigoDe = (pais?: Country): string => {
  if (!pais) return '';
  try {
    return `+${getCountryCallingCode(pais)}`;
  } catch {
    // País fora da tabela da biblioteca - não deve acontecer com as opções
    // que ela mesma fornece, mas não vale quebrar a lista por isso.
    return '';
  }
};

const SeletorPais = ({ value, options, onChange, disabled }: SeletorPaisProps) => {
  // O rótulo com o código entra na busca: digitar "55" acha o Brasil, que é
  // como quem conhece o DDI procura.
  const comCodigo = options.map((opcao) => ({
    ...opcao,
    rotulo: opcao.value ? `${opcao.label} (${codigoDe(opcao.value)})` : opcao.label,
  }));

  return (
    <Dropdown
      value={value}
      options={comCodigo}
      onChange={(e) => onChange(e.value)}
      disabled={disabled}
      filter
      filterPlaceholder="Buscar país ou código"
      filterBy="rotulo"
      optionLabel="rotulo"
      optionValue="value"
      // Fechado, mostra bandeira e código - o nome do país não caberia sem
      // roubar espaço do número.
      valueTemplate={(opcao: OpcaoPais & { rotulo?: string }) => (
        <div className="flex align-items-center gap-2 white-space-nowrap">
          <Bandeira pais={opcao?.value} />
          <span className="text-700">{codigoDe(opcao?.value)}</span>
        </div>
      )}
      itemTemplate={(opcao: OpcaoPais & { rotulo?: string }) => (
        <div className="flex align-items-center gap-2">
          <Bandeira pais={opcao?.value} />
          <span>{opcao?.rotulo}</span>
        </div>
      )}
      className="flex-none seletor-pais"
      panelClassName="w-20rem"
    />
  );
};

const InputTelefone = ({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  invalido,
  placeholder = 'Número com DDD',
}: InputTelefoneProps) => (
  <PhoneInput
    id={id}
    // Brasil como padrão, sem impedir os demais: é de onde vem quase todo
    // contato, e escolher o país a cada cadastro seria atrito à toa.
    defaultCountry="BR"
    labels={ptBR}
    international
    countryCallingCodeEditable={false}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    disabled={disabled}
    placeholder={placeholder}
    countrySelectComponent={SeletorPais}
    numberInputProps={{
      className: classNames('p-inputtext p-component w-full', {
        'p-invalid': invalido,
      }),
    }}
    className="input-telefone"
  />
);

export default InputTelefone;
