'use client';
import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setCookie } from 'nookies';

import { useService } from 'contexts/ServicesContext';
import useLocalStorage from 'hooks/useLocalStorage';
import { IParticipanteAtivo } from 'Interfaces';

const CardPlans = ({ plans }: { plans: IParticipanteAtivo[] }) => {
  const { setLoading } = useService();
  const { setItem } = useLocalStorage();
  const router = useRouter();

  const Select_Plan = useCallback(
    (id: number) => {
      const ativa = plans.find((e) => e.id === id);
      setItem('participacaoAtiva', JSON.stringify(ativa));
      setCookie(null, 'participacaoAtiva', JSON.stringify(ativa), {
        maxAge: 60 * 60,
        path: '/',
      });
      router.replace('/auth/validate_login');
      setLoading(true);
    },
    [plans],
  );
  useEffect(() => {
    setLoading(false);
  }, []);
  return (
    <div className="grid gap-3 justify-content-center pt-5 flipleft animation-duration-500">
      {plans.map((plano, key) => {
        return (
          <div
            key={key}
            className=" xs:col-10 md:col-4 lg:col-3 xl:col-2"
          >
            <div
              onClick={() => Select_Plan(plano.id)}
              className="card text-center transition-scale-1 cursor-pointer hover:shadow-4 shadow-2 "
            >
              <h4 className="text-lg md:text-xl text-pink-500">Entidade</h4>
              <p className="text-lg md:text-base text-pink-300">{plano.plano.entidadeNome}</p>

              <h4 className="text-lg md:text-xl text-pink-500">Plano</h4>
              <p className="text-lg md:text-base text-pink-300">{plano.plano.planoNome}</p>

              <h4 className="text-lg md:text-xl text-pink-500">Status</h4>
              <p className="text-lg md:text-base text-pink-300">
                {plano.assistido ? 'Assistido' : 'Ativo'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CardPlans;
