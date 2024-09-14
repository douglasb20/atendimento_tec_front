import Swal, { SweetAlertIcon } from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Button } from 'primereact/button';
import { redirect } from 'next/navigation';
import { ControllerFieldState } from 'react-hook-form';
import { parse, parseISO, format, add, sub, Duration, toDate } from 'date-fns';
import { isAxiosError, AxiosError } from 'axios';
import { ptBR } from 'date-fns/locale';
import { IResponseError, JWTToken } from '@/Interfaces';

interface IDateToBr {
  (
    date: string | number | Date,
    formatDate?: string,
    addDate?: null | Duration,
    subDate?: null | Duration,
  ): string;
}

export const msgRequired: string = 'Campo não pode ficar em branco';

export const RetornaAnos = (data, key) => {
  return (
    data &&
    data.reduce((prev, e) => {
      if (prev.length > 0) {
        if (prev[prev.length - 1] != e[key].slice(0, 4)) {
          prev.push(e[key].slice(0, 4));
        }
      } else {
        prev.push(e[key].slice(0, 4));
      }
      return prev;
    }, [])
  );
};

const MySwal = withReactContent(
  Swal.mixin({
    showCloseButton: true,
    showConfirmButton: false,
    allowOutsideClick: false,
  }),
);

/**
 *
 * @param {string} jwt token JWT a ser decodificado
 * @param {object} option um objeto {header : false} pra definir se retorna o header junto
 */
export function jwtDecode<T = any>(jwt: string, option = { header: false }): T {
  function b64DecodeUnicode(str) {
    return decodeURIComponent(
      atob(str).replace(/(.)/g, function (m, p) {
        let code = p.charCodeAt(0).toString(16).toUpperCase();
        if (code.length < 2) {
          code = '0' + code;
        }
        return '%' + code;
      }),
    );
  }

  function decode(str) {
    let output = str.replace(/-/g, '+').replace(/_/g, '/');
    switch (output.length % 4) {
      case 0:
        break;
      case 2:
        output += '==';
        break;
      case 3:
        output += '=';
        break;
      default:
        // eslint-disable-next-line
        throw 'Illegal base64url string!';
    }

    try {
      return b64DecodeUnicode(output);
    } catch (err) {
      return atob(output);
    }
  }

  let jwtArray = jwt.split('.');
  let payload = JSON.parse(decode(jwtArray[1]));
  let currentTime = Math.floor(new Date().getTime() / 1000.0);

  if (currentTime >= payload.exp) {
    throw new Error('Expired Token');
  }

  if (option.header) {
    return JSON.parse(decode(jwtArray[0]));
  }

  return payload as T;
}

/**
 * Função para adicionar uma máscara na string
 * @param {string} value Valor de como a mascara deve ser aplicado
 * @param {string} mask A mascara da string
 * @returns {string} Retorno do valor com a máscara
 */
export const mask = (value, mask) => {
  value = value.replace(/\D/g, '');
  let maskared = '';
  let k = 0;
  for (let i = 0; i <= mask.length - 1; ++i) {
    if (mask[i] == '#') {
      if (value[k] != undefined) {
        maskared += value[k++];
      }
    } else {
      if (mask[k] != undefined) {
        maskared += mask[i];
      }
    }
  }

  return maskared;
};

/**
 * Função para converter primeira letra em maiúscula de cada palavra.
 * @param {string} str Valor onde converterá a string para primeira letra maiúscula
 * @returns {string} String convertido em primeira maiúscula
 */
export const UcWords = (str) =>
  (str + '').toLowerCase().replace(/^([a-z])|\s+([a-z])/g, ($1) => $1.toUpperCase());

/**
 * Função para chamar alerta personalizado
 * @param {?string} message Define a mensagem que irá aparecer na tela
 * @param {?string} title Titulo do alerta
 * @param {?SweetAlertIcon} icon Tipo de icone do alerta (error, info ,question, success e warning)
 */
export function Alerta(
  message: string | React.JSX.Element,
  title = 'Alerta',
  icon: SweetAlertIcon = 'info',
) {
  MySwal.fire({
    title: <span className="text-10 font-semibold">{title}</span>,
    html: <i>{message}</i>,
    icon: icon,
    footer: (
      <Button
        autoFocus
        className="px-4 pl-1"
        label="OK"
        type="button"
        onClick={() => Swal.close()}
      />
    ),
  });
}

/**
 * Função para chamar alerta personalizado
 * @param {any} error Define a mensagem que irá aparecer na tela
 * @param {string} title Titulo do alerta
 */
export function CatchAlerta(error: any, title: string, redirecionamento = null) {
  let message: string = '';
  if (isAxiosError(error)) {
    const errorAxios: AxiosError<IResponseError> = error;
    if (errorAxios?.response) {
      message = errorAxios.response.data.message;
    } else if (errorAxios?.message) {
      message = errorAxios.message;
    }
  } else {
    if (error?.message) {
      message = error.message;
    } else {
      console.log(error);
      message = `${title.replace('.', '')}. Tente daqui alguns instantes.`;
    }
  }

  MySwal.fire({
    title: <span className="text-10 font-semibold">{title}</span>,
    html: <i>{message}</i>,
    icon: 'error',
    willClose: () => redirecionamento !== null && window.location.assign(redirecionamento),
    footer: (
      <Button
        autoFocus
        className="px-4 pl-1"
        label="OK"
        type="button"
        onClick={() => Swal.close()}
      />
    ),
  });
}

/**
 * Função para redirecionar após um alerta
 * @param {string} texto Define a mensagem que irá aparecer na tela
 * @param {string} redirecionamento url de redirecionamento
 * @param {?SweetAlertIcon} icon Tipo de icone do alerta (error, info ,question, success e warning)
 */
export function AlertaRedireciona(texto, redirecionamento, icon: SweetAlertIcon = 'info') {
  MySwal.fire({
    title: '<span class="text-10 font-semibold">Aviso</span>',
    html: texto,
    icon: icon,
    willClose: () => window.location.assign(redirecionamento),
    footer: (
      <Button
        autoFocus
        className="px-4 pl-1"
        label="Fechar"
        type="button"
        onClick={() => Swal.close()}
      />
    ),
  });

  return 1 + 1;
}

/**
 * Função para redirecionar após um alerta
 * @param {string} texto Define a mensagem que irá aparecer na tela
 * @param {*} callback Função de callback quando clicar no botão 'Fechar'
 * @param {?SweetAlertIcon} icon Tipo de icone do alerta (error, info ,question, success e warning)
 */
export function AlertaCallback(texto, callback, icon: SweetAlertIcon = 'info') {
  MySwal.fire({
    title: '<span class="text-10 font-semibold">Aviso</span>',
    html: texto,
    icon: icon,
    willClose: callback,
    footer: (
      <Button
        autoFocus
        className="px-4 pl-1"
        label="Fechar"
        type="button"
        onClick={() => Swal.close()}
      />
    ),
  });
}

/**
 * Função para chamar alerta personalizado
 * @type setCallback
 * @param {string} texto Define a mensagem que irá aparecer na tela
 * @param {setCallback} callback Callback que será chamado apor o click do botão de confrimar a ação
 * @param {*} dados Dados que será passado para o callback
 * @param {?string} title Titulo do alerta
 * @param {?string} btn_confirma Texto do botão de confirma
 * @param {?string} btn_cancela Texto do botão de cancela
 */
export function ConfirmaAcao(
  texto,
  callback,
  dados,
  title = 'Confirmação',
  btn_confirma = 'Sim',
  btn_cancela = 'Não',
) {
  if (dados === undefined) {
    dados = [];
  }
  MySwal.fire({
    title: <span className="text-10 font-semibold">{title}</span>,
    html: texto,
    icon: 'question',
    footer: (
      <div className="flex flex-1 justify-content-between">
        <Button
          label={btn_cancela}
          className="p-button-sm mx-1 p-button-outlined p-button-danger"
          type="button"
          onClick={() => Swal.close()}
        />
        <Button
          label={btn_confirma}
          className="p-button-sm mx-1"
          type="button"
          onClick={ExecutaCallback}
        />
      </div>
    ),
  });

  function ExecutaCallback() {
    callback(dados);
    Swal.close();
  }
}

/**
 *
 * @param {Number} value um valor decimal que será convertido
 * @returns {string} retorna o valor convertido para moeda
 */
export const FormatCurrency = (value, type: 'currency' | 'decimal' | 'percent' = 'currency') => {
  if (value) {
    return new Intl.NumberFormat('pt-BR', {
      style: type,
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('pt-BR', {
    style: type,
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(0);
};

/**
 * Função para formatar uma data
 * @param {string|number} date Date formatada ou timestamp a ser recebido
 * @param {string} format Formato de como a data será retornado
 * @param {number} add Quantidade de dias que irá `adicionar` na data
 * @param {number} sub Quantidade de dias que ira `subtrair` na data
 * @returns {string} retorno com a data formatado
 */
export const DateToBR: IDateToBr = (date, formatDate = 'P', addDate = null, subDate = null) => {
  let dateFormated: Date;

  if (typeof date == 'undefined') return date;

  switch (true) {
    case String(date).includes('/'):
      dateFormated = parse(date as string, 'dd/MM/yyyy', new Date());
      break;
    case date instanceof Date:
      dateFormated = date as Date;
      break;
    case typeof date == 'number':
      if (String(date as number).length === 10) {
        dateFormated = toDate((date as number) * 1000);
      } else {
        dateFormated = toDate(date as number);
      }
      break;
    default:
      if ((date as string).split(' ').length > 1 || (date as string).includes('T')) {
        dateFormated = parseISO(date as string);
      } else {
        dateFormated = parseISO((date as string) + ' 00:00:00');
      }
  }

  if (addDate !== null) {
    dateFormated = add(dateFormated, addDate);
  }
  if (subDate !== null) {
    dateFormated = sub(dateFormated, subDate);
  }

  formatDate = formatDate.toLocaleLowerCase() === 'dh' ? 'P HH:mm:ss' : formatDate;

  const newFormated = format(dateFormated, formatDate, { locale: ptBR });
  return newFormated;
};

export const ValidaCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.toString().length != 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  var result = true;
  [9, 10].forEach(function (j) {
    var soma = 0,
      r;
    cpf
      .split(/(?=)/)
      .splice(0, j)
      .forEach(function (e, i) {
        soma += parseInt(e) * (j + 2 - (i + 1));
      });
    r = soma % 11;
    r = r < 2 ? 0 : 11 - r;
    if (r != cpf.substring(j, j + 1)) result = false;
  });
  return result;
};
export function ValidaCNPJ(cnpj) {
  var b = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  var c = String(cnpj).replace(/\D/g, '');

  if (c.length !== 14) return false;

  if (/0{14}/.test(c)) return false;

  // @ts-ignore
  for (var i = 0, n = 0; i < 12; n += c[i] * b[++i]);
  // @ts-ignore
  if (c[12] != ((n %= 11) < 2 ? 0 : 11 - n)) return false;

  // @ts-ignore
  for (var i = 0, n = 0; i <= 12; n += c[i] * b[i++]);
  // @ts-ignore
  if (c[13] != ((n %= 11) < 2 ? 0 : 11 - n)) return false;

  return true;
}

export const ValidaEmail = (value: string) => {
  return /^[\w|\W]+\@[0-9a-zA-z-]+\.[a-zA-Z]{2,3}(\.[a-zA-z]{2,3})?$/.test(value);
};

export const sleep = async (ms: number) =>
  await new Promise((resolve) => setTimeout(resolve, ms * 1000));

export const AjustaTelefone = (val: string): string => {
  let formatted = '';
  let format = '';
  let clanVal = val.replace(/\D/g, '');
  if (clanVal.replace(/\D/g, '') !== '') {
    format = clanVal.length > 10 ? '(##) # ####-####' : '(##) ####-####';
    formatted = mask(clanVal, format);
  }
  return formatted;
};

export const B64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
  const byteCharacters = atob(b64Data.replace(/\s/g, ''));
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
};

export const FileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
      if (encoded.length % 4 > 0) {
        encoded += '='.repeat(4 - (encoded.length % 4));
      }
      resolve(encoded);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getFormErrorMessage = (state: ControllerFieldState) => {
  return state.invalid && <small className="p-error">{state.error?.message}</small>;
};

export const RemoveTZDate = (date: string) => date.replace(/(.000\+00\:00)/g, '').trim();

export const ThrowError = (error, title) => {
  let message: string = '';
  if (isAxiosError(error)) {
    const errorAxios: AxiosError<IResponseError> = error;
    if (errorAxios?.response?.data) {
      message = errorAxios.response.data.message;
    } else if (errorAxios?.message) {
      message = errorAxios.message;
    }
  } else {
    if (error?.message) {
      message = error.message;
    } else {
      message = `${title.replace('.', '')}. Tente daqui alguns instantes.`;
    }
  }

  throw { message, title };
};
