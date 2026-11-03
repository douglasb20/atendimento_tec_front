import { cookies } from 'next/headers';
import { Fragment } from 'react';

import { UserInfo } from '@/Interfaces';
import CardsResumo from './_CardsResumo';
import GraficoFinalizados from './_GraficoFinalizados';
import MovimentoPorHora from './_MovimentoPorHora';
import MovimentoPorSemana from './_MovimentoPorSemana';
import HeaderSection from './_HeaderSection';

export default async function DashboardPage() {
  const cookieStorage = await cookies();
  const userInfoString: string = cookieStorage.get('userInfo')?.value;
  const userInfoDecoded = JSON.parse(userInfoString) as UserInfo;

  return (
    <Fragment>
      <div className="grid gap-2 justify-content-center">
        <div
          className="col-12"
          style={{ maxWidth: 1400 }}
        >
          <HeaderSection
            name={userInfoDecoded.name}
            lastLogin={userInfoDecoded.lastlogin_at}
            avatarUrl={userInfoDecoded.avatar_url}
          />

          <CardsResumo />

          {/* Mesma largura dos dois primeiros cards: eles são `xl:col-3` cada,
              e o gráfico ocupa `xl:col-6`. A distribuição semanal toma a outra metade. */}
          <div className="grid">
            <div className="col-12 xl:col-6">
              <GraficoFinalizados />
            </div>
            <div className="col-12 xl:col-6">
              <MovimentoPorSemana />
            </div>
            <div className="col-12">
              <MovimentoPorHora />
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
