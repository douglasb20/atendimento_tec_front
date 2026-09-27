'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { AlertaCallback, getFormErrorMessage, msgRequired } from '@/service/Util';
import useApi from '@/service/Api/ApiClient';

type FormFields = {
  name: string;
  last_name: string;
  password: string;
  confirma: string;
};

const schema = yup.object({
  name: yup.string().required(msgRequired),
  last_name: yup.string().notRequired(),
  // Seis caracteres, o mesmo mínimo do restante do sistema.
  password: yup.string().required(msgRequired).min(6, 'A senha precisa ter ao menos 6 caracteres'),
  confirma: yup
    .string()
    .required('Repita a senha para confirmar')
    .oneOf([yup.ref('password')], 'As senhas não conferem'),
});

export default function BoxAceitarConvite({ token }: { token: string }) {
  const { handleSubmit, control, watch, trigger, getValues } = useForm<FormFields>({
    defaultValues: { name: '', last_name: '', password: '', confirma: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: yupResolver<any>(schema),
  });

  // Revalida a confirmação quando a senha muda: sem isto, corrigir a primeira
  // depois de a segunda já ter sido validada deixava o erro "não conferem" na
  // tela mesmo com as duas iguais.
  const senha = watch('password');
  useEffect(() => {
    if (getValues('confirma')) trigger('confirma');
  }, [senha]);

  const { FetchReq } = useApi();
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const onSubmit = async ({ name, last_name, password }: FormFields) => {
    setErro(null);
    setSalvando(true);

    try {
      await FetchReq({
        endpoint: 'AceitarConvite',
        variables: [token],
        body: { name, last_name: last_name || null, password },
      });

      AlertaCallback(
        'Conta ativada! Entre com o e-mail e a senha que você definiu.',
        () => router.push('/auth/login'),
        'success',
      );
    } catch (err) {
      // O convite pode ter vencido entre a validação da página e o envio.
      setErro(
        err?.response?.data?.message ??
          'Não foi possível ativar a conta. Peça um novo convite.',
      );
      setSalvando(false);
    }
  };

  return (
    <div style={{ maxWidth: '26rem' }}>
      <h2 className="text-900 text-2xl font-bold mb-2">Complete seu cadastro</h2>
      <p className="text-600 line-height-3 mb-4">
        Defina seu nome e uma senha para acessar o sistema.
      </p>

      <div className="p-fluid">
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <>
              <label
                htmlFor={field.name}
                className="block text-900 font-medium mb-2"
              >
                Nome
              </label>
              <InputText
                id={field.name}
                {...field}
                autoFocus
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />

        <div className="mt-3">
          <Controller
            control={control}
            name="last_name"
            render={({ field, fieldState }) => (
              <>
                <label
                  htmlFor={field.name}
                  className="block text-900 font-medium mb-2"
                >
                  Sobrenome
                </label>
                <InputText
                  id={field.name}
                  {...field}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="mt-3">
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <>
                <label
                  htmlFor={field.name}
                  className="block text-900 font-medium mb-2"
                >
                  Senha
                </label>
                <Password
                  id={field.name}
                  {...field}
                  toggleMask
                  feedback={false}
                  autoComplete="new-password"
                  placeholder="Ao menos 6 caracteres"
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        <div className="mt-3">
          <Controller
            control={control}
            name="confirma"
            render={({ field, fieldState }) => (
              <>
                <label
                  htmlFor={field.name}
                  className="block text-900 font-medium mb-2"
                >
                  Confirme a senha
                </label>
                <Password
                  id={field.name}
                  {...field}
                  toggleMask
                  feedback={false}
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(onSubmit)()}
                />
                {getFormErrorMessage(fieldState)}
              </>
            )}
          />
        </div>

        {erro && (
          <Message
            severity="error"
            className="w-full justify-content-start mt-3"
            text={erro}
          />
        )}

        <Button
          label="Ativar minha conta"
          icon={PrimeIcons.CHECK}
          className="w-full mt-4"
          loading={salvando}
          onClick={() => handleSubmit(onSubmit)()}
        />

        <div className="text-center mt-4">
          <Link
            href="/auth/login"
            className="text-600 no-underline hover:text-primary"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
