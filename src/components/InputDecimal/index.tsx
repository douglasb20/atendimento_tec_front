import { ChangeEvent, Ref, forwardRef } from 'react';
import { InputText, InputTextProps } from 'primereact/inputtext';

interface IProps extends InputTextProps {
  mode: 'decimal' | 'currency';
  onChangeDecimal?: (val: number) => void;
}

const InputDecimal = forwardRef(
  // eslint-disable-next-line
  ({ mode, onChangeDecimal, ...props }: IProps, ref: Ref<HTMLInputElement>) => {
    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
      const val =
        e.target.value.replace(/\D/g, '') === ''
          ? 0.0
          : parseFloat(e.target.value.replace(/\D/g, '')) / 100;

      onChangeDecimal(val);
    };

    const maskValue = (value: number): string => {
      // const val = value?.replace(/\D/g, '') === "" ? 0.00 : parseFloat(value?.replace(/\D/g, '')) / 100;
      const val = +value;
      let a: string;
      switch (mode) {
        case 'decimal':
          a = '0,00';
          a = new Intl.NumberFormat('pt-br', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(val);
          break;
        case 'currency':
          a = 'R$ 0,00';
          a = new Intl.NumberFormat('pt-br', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(val);
          break;
      }

      return a;
    };

    return (
      <InputText
        {...props}
        value={maskValue(+props.value)}
        onChange={(e) => onChange(e)}
      />
    );
  },
);

InputDecimal.displayName;

export default InputDecimal;
