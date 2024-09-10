'use client';
import Lottie from 'lottie-react';
import * as animationData from 'assets/loading.json';
import styles from './loading.module.scss';

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
