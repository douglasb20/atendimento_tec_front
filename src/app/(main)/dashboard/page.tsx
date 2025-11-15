import { cookies } from 'next/headers';
import { Fragment } from 'react';

import { UserInfo } from '@/Interfaces';
import HeaderSection from './HeaderSection';

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
        </div>
      </div>
    </Fragment>
  );
}
