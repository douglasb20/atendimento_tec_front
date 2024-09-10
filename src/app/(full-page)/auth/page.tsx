'use client';
import React from 'react';
import styles from './Auth.module.scss';
import { Messages } from 'primereact/messages';

export default function Auth() {
  const msgRef = React.useRef(null);

  React.useEffect(() => {
    document.body.style.backgroundColor = '#c72992';
    let error = new URL(window.location.href).searchParams.get('error');
    let code = new URL(window.location.href).searchParams.get('code');

    if (error) {
      let sendError = {
        type: error,
        error_description: new URL(window.location.href).searchParams.get('error_description'),
      };
      window.opener.postMessage({ error: sendError }, '*');
    } else if (code) {
      window.opener.postMessage(
        { code: new URL(window.location.href).searchParams.get('code') },
        '*',
      );
    } else {
      msgRef.current?.show({
        severity: 'warn',
        content: 'Ocorreu um erro ao tentar capturar os parametros. Tente atualizar o navegador',
        sticky: true,
        closable: false,
      });
    }

    window.self.close();
  }, []);

  return (
    <div className={styles.caixaAviso}>
      <Messages ref={msgRef}></Messages>
    </div>
  );
}
