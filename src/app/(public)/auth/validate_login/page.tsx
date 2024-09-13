'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ValidateLoginPage = () => {
  const router = useRouter();
  useEffect(() => {
    router.push('/');
  }, []);
  return null;
};

export default ValidateLoginPage;
