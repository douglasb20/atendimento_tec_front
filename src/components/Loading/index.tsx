import React from 'react';
import dynamic from 'next/dynamic';
// import Lottie from 'lottie-react';
import * as animationData from '@/assets/loading.json';
import styles from './loading.module.scss';
import { useService } from '@/contexts/ServicesContext';

const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
});
export default function Loading() {
  const { isLoading } = useService();

  return (
    <div className={`${styles.AreaLoading} ${!isLoading ? styles.hidden : ''}`}>
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
