'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

import { CatchAlerta, getFormErrorMessage, msgRequired, sleep, ValidaEmail } from '@/service/Util';
import { useAuth } from '@/contexts/AuthContext';
import { useService } from '@/contexts/ServicesContext';
import { PrimeIcons } from 'primereact/api';
import Image from 'next/image';

interface IFormFields {
  email: string;
  password: string;
}

const schema = yup.object({
  email: yup
    .string()
    .required(msgRequired)
    .test('email-validation', 'Email com formato inválido', (val) => ValidaEmail(val)),
  password: yup.string().required(msgRequired).min(4, 'Senha deve ter mais de 4 caracteres'),
});

export default function BoxLoginSection() {
  const { handleSubmit, control } = useForm<IFormFields>({
    defaultValues: {
      email: '',
      password: '',
    },
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });
  const { login } = useAuth();
  const { setLoading } = useService();
  const router = useRouter();

  const handleLogin = async (data: IFormFields) => {
    try {
      setLoading(true);
      await login(data.email, data.password);

      await sleep(1 / 100);
      router.push('/auth/validate_login');
    } catch (err) {
      CatchAlerta(err, 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  const pressEnter = (e) => {
    if (e.keyCode === 13) {
      document.getElementById('btnEntrar').click();
    }
  };
  return (
    <>
      <div className="mb-4 flex flex-column align-items-center gap-2">
        <Image
          alt="Automatec"
          src="/images/logo.png"
          width={90}
          height={90}
          priority
        />
        <span className="text-600 font-medium">Faça o login para entrar no sistema</span>
      </div>
      <div className="flex flex-column gap-2">
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => {
            return (
              <>
                <IconField iconPosition="left">
                  <InputIcon className={PrimeIcons.ENVELOPE} />
                  <InputText
                    id={field.name}
                    {...field}
                    type="email"
                    className="shadow-none w-full md:w-25rem"
                    placeholder="Email"
                    autoComplete="off"
                  />
                </IconField>
                {getFormErrorMessage(fieldState)}
              </>
            );
          }}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => {
            return (
              <>
                <IconField iconPosition="left">
                  <InputIcon className={PrimeIcons.LOCK} />
                  <InputText
                    id={field.name}
                    onKeyDown={pressEnter}
                    type="password"
                    className={`shadow-none box w-full md:w-25rem `}
                    placeholder="Password"
                    {...field}
                  />
                </IconField>
                {getFormErrorMessage(fieldState)}
              </>
            );
          }}
        />
        <div className="mb-2 flex flex-wrap gap-3">
          <a className="hidden text-600 cursor-pointer hover:text-primary cursor-pointer ml-auto transition-colors transition-duration-300">
            Esqueci minha senha
          </a>
        </div>
        <Button
          id="btnEntrar"
          label="Entrar"
          className="w-full"
          onClick={handleSubmit(handleLogin)}
        />
      </div>
    </>
  );
}
