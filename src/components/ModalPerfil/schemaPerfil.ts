import * as yup from 'yup';

import { msgRequired, ValidaEmail } from '@/service/Util';

export const schemaPerfil = yup.object({
  name: yup.string().required(msgRequired),
  last_name: yup.string().nullable(),
  email: yup.string().required(msgRequired)
    .test('email-validation', 'Email com formato inválido', valor => ValidaEmail(valor)),
  // String vazia não é ausência para o min do Yup. Mantém a senha atual
  // sem validar tamanho; uma senha preenchida é preservada sem trim.
  senha: yup.string().transform(valor => valor === '' ? undefined : valor)
    .nullable().min(6, 'A senha precisa ter ao menos 6 caracteres'),
  confirma_senha: yup.string().transform(valor => valor === '' ? undefined : valor).nullable().when('senha', {
    is: (senha: string | null | undefined) => Boolean(senha),
    then: campo => campo.required('Confirme a nova senha').oneOf([yup.ref('senha')], 'As senhas não conferem'),
    otherwise: campo => campo.notRequired(),
  }),
});
