'use client';
import { memo, useEffect } from 'react';

import { useService } from '@/contexts/ServicesContext';
import { DateToBR, UcWords } from '@/service/Util';
import Avatar from '@/components/Avatar';

type HeaderSectionProps = {
  name: string;
  lastLogin: string;
  avatarUrl?: string;
};

const HeaderSection = ({ name, lastLogin, avatarUrl }: HeaderSectionProps) => {
  const { setLoading } = useService();

  /**
   * O `name` já é o primeiro nome desde a separação de nome/sobrenome - o
   * `split(' ')[0]` que havia aqui virou redundante, e estourava com nome
   * vazio. O `UcWords` fica: o cadastro aceita "douglas" em minúsculas.
   */
  const primeiroNome = UcWords((name ?? '').trim().toLowerCase());

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="col-12 mb-4 ">
      <div className="flex flex-column sm:flex-row align-items-center gap-4">
        <div className="flex flex-column sm:flex-row align-items-center gap-3 w-full">
          <div
            className="relative border-circle overflow-hidden flex-shrink-0 surface-border"
            style={{ width: '4rem', height: '4rem' }}
          >
            <Avatar
              src={avatarUrl}
              className="flex-shrink-0 inside-shadow"
              fill
              sizes="200"
              style={{ objectFit: 'cover' }}
            />
          </div>
          <div className="flex flex-column align-items-center sm:align-items-start w-full">
            <div className="flex justify-content-between w-full">
              <span className="font-bold text-4xl text-10">Olá, {primeiroNome}</span>
            </div>
            {lastLogin && (
              <p className="text-600 m-0">
                Último login realizado em{' '}
                <span className="font-bold text-primary">{DateToBR(lastLogin, 'dh')}</span>{' '}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(HeaderSection);
