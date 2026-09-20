'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PrimeIcons } from 'primereact/api';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { AlertaCallback, getFormErrorMessage, msgRequired } from '@/service/Util';
import useApi from '@/service/Api/ApiClient';

type FormFields = { password: string; confirma: string };

const schema = yup.object({
  // Seis caracteres, o mesmo mínimo do cadastro de usuário: exigir mais aqui
  // deixaria o usuário com uma senha que o próprio cadastro não aceitaria.
  password: yup.string().required(msgRequired).min(6, 'A senha precisa ter ao menos 6 caracteres'),
  confirma: yup
    .string()
    .required('Repita a senha para confirmar')
    .oneOf([yup.ref('password')], 'As senhas não conferem'),
});

export default function BoxRedefinirSenha({ token }: { token: string }) {
  const { handleSubmit, control, watch, trigger, getValues } = useForm<FormFields>({
    defaultValues: { password: '', confirma: '' },
    // `onBlur` nos dois: sem `mode`, a primeira validação só acontece ao
    // submeter — o usuário digitava as duas senhas diferentes, clicava, e só
    // então descobria. Agora o aviso sai ao sair do campo.
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

  const onSubmit = async ({ password }: FormFields) => {
    setErro(null);
    setSalvando(true);

    try {
      await FetchReq({ endpoint: 'RedefinirSenha', body: { token, password } });

      AlertaCallback(
        'Senha alterada! Entre com a nova senha.',
        () => router.push('/auth/login'),
        'success',
      );
    } catch (err) {
      // O link pode ter vencido entre a validação da página e o envio — são 30
      // minutos, e alguém pode deixar a aba aberta.
      setErro(
        err?.response?.data?.message ??
          'Não foi possível alterar a senha. Peça um novo link de redefinição.',
      );
      setSalvando(false);
    }
  };

  return (
    <div style={{ maxWidth: '26rem' }}>
      <h2 className="text-900 text-2xl font-bold mb-2">Criar nova senha</h2>
      <p className="text-600 line-height-3 mb-4">
        Escolha uma senha que você ainda não usou neste sistema.
      </p>

      <div className="p-fluid">
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <>
              <label
                htmlFor={field.name}
                className="block text-900 font-medium mb-2"
              >
                Nova senha
              </label>
              <Password
                id={field.name}
                {...field}
                toggleMask
                // Sem o medidor: ele avalia por caracteres especiais e passa a
                // impressão de que uma senha "fraca" será recusada, o que não
                // acontece — a regra é o mínimo de 6.
                feedback={false}
                autoComplete="new-password"
                placeholder="Ao menos 6 caracteres"
                autoFocus
              />
              {getFormErrorMessage(fieldState)}
            </>
          )}
        />

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
          label="Salvar nova senha"
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
