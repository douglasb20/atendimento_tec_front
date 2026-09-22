'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { getFormErrorMessage, msgRequired, ValidaEmail } from '@/service/Util';
import useApi from '@/service/Api/ApiClient';

type FormFields = { email: string };

const schema = yup.object({
  email: yup
    .string()
    .required(msgRequired)
    .test('email-validation', 'Email com formato inválido', (val) => ValidaEmail(val)),
});

export default function BoxEsqueciSenha() {
  const { handleSubmit, control, getValues } = useForm<FormFields>({
    defaultValues: { email: '' },
    reValidateMode: 'onBlur',
    resolver: yupResolver<any>(schema),
  });
  const { FetchReq } = useApi();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const onSubmit = async ({ email }: FormFields) => {
    setErro(null);
    setEnviando(true);

    try {
      await FetchReq({ endpoint: 'EsqueciSenha', body: { email } });
      setEnviado(true);
    } catch (err) {
      // Inline, não `Swal`: na maioria das vezes é erro de digitação, e um
      // diálogo modal para isso obriga um clique a mais sem necessidade.
      const status = err?.response?.status;
      setErro(
        status === 404
          ? 'Não encontramos uma conta com esse e-mail.'
          : 'Não foi possível enviar o e-mail. Tente novamente em instantes.',
      );
    } finally {
      setEnviando(false);
    }
  };

  // Confirmação no lugar do formulário - não volta para o login sozinho, senão
  // o usuário fica sem saber se o pedido foi aceito.
  if (enviado) {
    return (
      <div
        className="flex flex-column align-items-center text-center"
        style={{ maxWidth: '26rem' }}
      >
        <i
          className={`${PrimeIcons.SEND} text-5xl text-primary mb-3`}
          aria-hidden
        />
        <h2 className="text-900 text-2xl font-bold mb-2">Verifique seu e-mail</h2>
        <p className="text-600 line-height-3 mb-1">
          Enviamos as instruções de redefinição para <strong>{getValues('email')}</strong>.
        </p>
        <p className="text-600 text-sm line-height-3 mb-4">
          O link vale por 30 minutos. Se não encontrar a mensagem, confira a caixa de spam.
        </p>
        <Link
          href="/auth/login"
          className="text-primary font-medium no-underline hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '26rem' }}>
      <h2 className="text-900 text-2xl font-bold mb-2">Esqueci minha senha</h2>
      <p className="text-600 line-height-3 mb-4">
        Informe o e-mail da sua conta e enviaremos um link para você criar uma senha nova.
      </p>

      <div className="p-fluid">
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <>
              <label
                htmlFor={field.name}
                className="block text-900 font-medium mb-2"
              >
                E-mail
              </label>
              <IconField iconPosition="left">
                <InputIcon className={PrimeIcons.ENVELOPE} />
                <InputText
                  id={field.name}
                  {...field}
                  type="email"
                  placeholder="seu.email@empresa.com"
                  autoFocus
                  // Enter envia: o formulário tem um campo só, e obrigar o
                  // clique no botão seria atrito à toa.
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(onSubmit)()}
                />
              </IconField>
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />

        {/* `Message` e não um `small` discreto: o usuário acabou de clicar num
            botão e precisa ver que algo deu errado sem procurar na tela. */}
        {erro && (
          <Message
            severity="error"
            className="w-full justify-content-start mt-3"
            text={erro}
          />
        )}

        <Button
          label="Solicitar"
          icon={PrimeIcons.SEND}
          className="w-full mt-4"
          loading={enviando}
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
