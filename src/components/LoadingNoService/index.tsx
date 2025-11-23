'use client';
import dynamic from 'next/dynamic';
import * as animationData from '@/assets/loading.json';
import styles from './loading.module.scss';

const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
});

export default function LoadingNoService() {
  return (
    <div className={`${styles.AreaLoading}`}>
      <div className={styles.caixaLoading}>
        <Lottie
          animationData={animationData}
          height={400}
          width={400}
        />
      </div>
    </div>
  );
}
