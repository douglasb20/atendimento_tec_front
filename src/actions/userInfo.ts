'use server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

import { UserInfo, JWTToken } from '@/Interfaces';
import ApiServer from '@/service/Api/ApiServer';
import { COOKIE_TEMA, normalizaTema, serializaTema } from '@/service/Tema';

export async function getUserInfo() {
  try {
    const cookieStorage = await cookies();

    const { FetchReq } = await ApiServer();
    const user = await FetchReq<UserInfo>('UserInfo');

    const tokenString: string = cookieStorage.get('token')?.value;
    const tokenDecoded = jwtDecode<JWTToken>(tokenString);

    // Vence junto com o access token - hoje 30 minutos -, e o middleware o
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

    // Espelha o tema do banco num cookie próprio, que o `RootLayout` lê para
    // montar o `<link>` já no servidor.
    //
    // Separado do `userInfo` por causa da validade: aquele vence em 30 minutos
    // (é o que faz uma troca de papel chegar rápido à tela), e o tema
    // sobrevivendo a isso evita o flash em toda navegação depois que ele
    // expira. Aqui é um ano - é preferência, não sessão.
    //
    // É também o que resolve o primeiro acesso numa máquina nova: sem este
    // gravar, o servidor pintaria no padrão até a pessoa reabrir a página.
    const tema = normalizaTema(user.tema, user.modo_tema);

    cookieStorage.set({
      name: COOKIE_TEMA,
      value: serializaTema(tema.cor, tema.modo),
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  } catch (err) {
    console.log(err?.request);
    throw err;
  }
}
