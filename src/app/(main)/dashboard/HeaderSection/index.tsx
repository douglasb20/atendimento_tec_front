'use client';
import { memo, useEffect } from 'react';

import { useService } from '@/contexts/ServicesContext';
import { DateToBR, UcWords } from '@/service/Util';
import Image from 'next/image';

type HeaderSectionProps = {
  name: string;
  lastLogin: string;
  avatarUrl?: string;
};

const HeaderSection = ({ name, lastLogin, avatarUrl }: HeaderSectionProps) => {
  const { setLoading } = useService();

  const ArrumaPrimeiroNome = (nome: string): string => {
    let separaNome: string[] = nome.split(' ');
    const primeiroNome: string = separaNome[0].toLowerCase();
    return UcWords(primeiroNome);
  };

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
            <Image
              alt="avatar"
              src={avatarUrl || '/images/avatar/avatar-noprofile.png'}
              className="flex-shrink-0 inside-shadow"
              fill
              sizes="200"
              style={{ objectFit: 'cover' }}
            />
          </div>
          <div className="flex flex-column align-items-center sm:align-items-start w-full">
            <div className="flex justify-content-between w-full">
              <span className="font-bold text-4xl text-10">Olá, {ArrumaPrimeiroNome(name)}</span>
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
