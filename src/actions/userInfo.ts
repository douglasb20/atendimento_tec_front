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

    // Vence junto com o access token — hoje 30 minutos —, e o middleware o
    // recria na navegação seguinte por achá-lo ausente. Esse vencimento curto
    // é o que faz uma troca de papel chegar à interface sem o usuário precisar
    // sair e entrar: as permissões que ele carrega valem no máximo esse tempo.
    //
    // Não o alongue para a validade do refresh (30 dias): quem tivesse o
    // portal aberto ficaria com as permissões antigas até o fim do mês.
    const validadeSegundos = Math.max(
      60,
      Number(tokenDecoded.exp) - Math.floor(Date.now() / 1000.0),
    );

    cookieStorage.set({
      name: 'userInfo',
      value: JSON.stringify(user),
      maxAge: validadeSegundos,
      path: '/',
    });
  } catch (err) {
    console.log(err?.request);
    throw err;
  }
}
