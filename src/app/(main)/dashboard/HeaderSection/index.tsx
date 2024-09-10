'use client';
import { memo, useEffect, useState } from 'react';
import { UcWords } from 'service/Util';
import { Button } from 'primereact/button';
import { useService } from 'contexts/ServicesContext';
import { IPrincipal } from 'Interfaces';

const HeaderSection = () => {
  const { setModalFaturamento } = useService();
  const [principal, setPrincipal] = useState<IPrincipal>();

  const ArrumaPrimeiroNome = (nome) => {
    let separaNome = nome.split(' ');
    separaNome = separaNome[0].toLowerCase();
    return separaNome[0].toUpperCase() + separaNome.slice(1);
  };

  useEffect(() => {
    const principalStorage = JSON.parse(localStorage.getItem('principal'));
    setPrincipal(principalStorage);
  }, []);

  if (!principal || principal === null) {
    return null;
  }

  return (
    <div className="col-12 mb-4 ">
      <div className="flex flex-column sm:flex-row align-items-center gap-4">
        <div className="flex flex-column sm:flex-row align-items-center gap-3 w-full">
          <img
            alt="avatar"
            src={`/image/avatar/avatar-m-8.png`}
            className="w-4rem h-4rem flex-shrink-0 inside-shadow"
          />
          <div className="flex flex-column align-items-center sm:align-items-start w-full">
            <div className="flex justify-content-between w-full">
              <span className="font-bold text-4xl text-10">
                Olá, {ArrumaPrimeiroNome(principal?.proponenteNome)}
              </span>
              <Button
                label="Realizar um aporte"
                size="small"
                icon="fa-light fa-sack-dollar"
                onClick={() => {
                  setModalFaturamento({
                    visible: true,
                    mode: 'aporte',
                  });
                }}
              />
            </div>
            <p className="text-600 m-0">
              Você está{' '}
              <span className="font-bold text-primary">
                {UcWords(principal?.statusParticipacaoDescricao)}
              </span>{' '}
              no plano {principal?.nomePlano}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(HeaderSection);
