'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { sleep } from '@/service/Util';

const LogoutPage = () => {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await logout();
      await sleep(1 / 100);
      router.push('/auth/login');
    })();
  }, []);
  return null;
};

export default LogoutPage;
