'use client';
import React from 'react';
import Lottie from 'lottie-react';
import * as animationData from 'assets/loading.json';
import styles from './loading.module.scss';
import { useService } from 'contexts/ServicesContext';

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
