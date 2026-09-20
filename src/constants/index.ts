export const PUBLIC_ROUTES: (string | RegExp)[] = [
  '/auth/login',
  '/auth/logout',
  '/auth',
  '/404',
  '/notfound',
  '/auth/validate_login',
  '/auth/esqueci-senha',
  // `RegExp` porque o token vai no caminho: o middleware compara por igualdade
  // exata, e uma string fixa nunca casaria. Sem esta entrada o link do e-mail
  // levaria direto ao logout.
  /^\/auth\/redefinir-senha\/[^/]+$/,
  '/plans',
];
