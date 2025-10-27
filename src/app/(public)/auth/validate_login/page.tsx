'use client';
import { getUserInfo } from '@/actions/userInfo';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ValidateLoginPage = () => {
  const router = useRouter();
  useEffect(() => {
    getUserInfo().then(() => {
      router.push('/');
    });
  }, []);
  return null;
};

export default ValidateLoginPage;
