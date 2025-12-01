'use server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

import { UserInfo, JWTToken } from '@/Interfaces';
import ApiServer from '@/service/Api/ApiServer';

export async function getUserInfo() {
  try {
    const cookieStorage = await cookies();

    const { FetchReq } = await ApiServer();
    const user = await FetchReq<UserInfo>('UserInfo');

    const tokenString: string = cookieStorage.get('token')?.value;
    const tokenDecoded = jwtDecode<JWTToken>(tokenString);

    cookieStorage.set({
      name: 'userInfo',
      value: JSON.stringify(user),
      maxAge: Number(tokenDecoded.exp) - Math.floor(Date.now() / 1000.0),
      path: '/',
    });
  } catch (err) {
    console.log(err?.request);
    throw err;
  }
}
