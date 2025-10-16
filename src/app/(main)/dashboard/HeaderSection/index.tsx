'use client'
import { useService } from '@/contexts/ServicesContext';
import { memo, useEffect } from 'react';
import { DateToBR, UcWords } from 'service/Util';

type HeaderSectionProps = {
  name: string;
  lastLogin: string;
}

const HeaderSection = ({ name, lastLogin }: HeaderSectionProps) => {
  const {setLoading} = useService()

  const ArrumaPrimeiroNome = (nome: string): string => {
    let separaNome: string[] = nome.split(' ');
    const primeiroNome: string = separaNome[0].toLowerCase();
    return UcWords(primeiroNome);
  };

  useEffect(() => {
    setLoading(false);
  }, [])

  return (
    <div className="col-12 mb-4 ">
      <div className="flex flex-column sm:flex-row align-items-center gap-4">
        <div className="flex flex-column sm:flex-row align-items-center gap-3 w-full">
          <img
            alt="avatar"
            src={`/images/avatar/avatar-m-8.png`}
            className="w-4rem h-4rem flex-shrink-0 inside-shadow"
          />
          <div className="flex flex-column align-items-center sm:align-items-start w-full">
            <div className="flex justify-content-between w-full">
              <span className="font-bold text-4xl text-10">
                Olá, {ArrumaPrimeiroNome(name)}
              </span>
            </div>
            <p className="text-600 m-0">
              Último login realizado em {' '}
              <span className="font-bold text-primary">
                {DateToBR(lastLogin, 'dh')}
              </span>{' '}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(HeaderSection);
