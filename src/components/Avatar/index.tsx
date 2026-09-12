'use client';

import Image, { ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

const AVATAR_PADRAO = '/images/avatar/avatar-noprofile.png';

/**
 * Hosts que o `next/image` pode otimizar, conforme `next.config.js`.
 *
 * Fora desta lista o Next **lança durante o render** - não é um erro de
 * carregamento que o `onError` pegaria, e sim uma exceção que sobe até o error
 * boundary e derruba a página inteira. Avatares do WhatsApp (`pps.whatsapp.net`)
 * caem aqui, e suas URLs têm assinatura com validade, o que as torna más
 * candidatas a otimização de qualquer forma.
 */
const HOSTS_OTIMIZAVEIS = ['s3.eu-central-003.backblazeb2.com'];

const podeOtimizar = (url: string) => {
  if (!url.startsWith('http')) return true; // caminho local

  try {
    return HOSTS_OTIMIZAVEIS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

type AvatarProps = Omit<ImageProps, 'src' | 'alt'> & {
  src?: string | null;
  alt?: string;
};

/**
 * Avatar tolerante a falha na URL remota.
 *
 * A URL vem do storage e pode falhar por motivos fora do nosso controle - host
 * trocado, arquivo removido pela retenção, bucket indisponível. Como o
 * `next/image` lança quando o host não está liberado em `next.config.js`, um
 * avatar quebrado derrubaria a página inteira pelo error boundary. Aqui a falha
 * apenas cai no avatar padrão.
 */
const Avatar = ({ src, alt = 'avatar', ...props }: AvatarProps) => {
  const [falhou, setFalhou] = useState(false);

  // Nova URL merece nova tentativa: sem isto, um erro anterior fixaria o
  // padrão mesmo depois de o usuário trocar a foto.
  useEffect(() => setFalhou(false), [src]);

  const url = !src || falhou ? AVATAR_PADRAO : src;

  return (
    <Image
      {...props}
      alt={alt}
      src={url}
      // Servido direto, sem passar pelo otimizador do Next, quando o host não
      // está declarado - melhor exibir a imagem do que quebrar a tela.
      unoptimized={props.unoptimized ?? !podeOtimizar(url)}
      onError={(evento) => {
        setFalhou(true);
        // Repassado para quem usa o carregamento como fim de estado (spinner):
        // sem isto, uma imagem quebrada deixaria o indicador girando para sempre.
        props.onError?.(evento);
      }}
    />
  );
};

export default Avatar;
