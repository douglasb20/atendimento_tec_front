'use client';
import { getUserInfo } from '@/actions/userInfo';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ValidateLoginPage = () => {
  const router = useRouter();
  useEffect(() => {
    try {
      getUserInfo()
        .then(() => {
          router.push('/');
        })
        .catch((error) => {
          console.error(error);
        });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, []);
  return null;
};

export default ValidateLoginPage;
