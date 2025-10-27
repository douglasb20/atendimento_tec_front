import { Fragment } from 'react';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

import HeaderSection from './HeaderSection';
import { JWTToken } from '@/Interfaces';

export default async function DashboardPage() {
  const cookieStorage = await cookies();
  const tokenString: string = cookieStorage.get('token')?.value;
  const tokenDecoded = jwtDecode<JWTToken>(tokenString);

  return (
    <Fragment>
      <div className="grid gap-2 justify-content-center">
        <div
          className="col-12"
          style={{ maxWidth: 1400 }}
        >
          <HeaderSection
            name={tokenDecoded.name}
            lastLogin={tokenDecoded.lastlogin_at}
          />
        </div>
      </div>
    </Fragment>
  );
}
