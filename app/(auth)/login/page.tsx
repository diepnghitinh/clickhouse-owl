'use client';

import { useRouter } from 'next/navigation';
import { Login } from '@/components/Login';

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    router.push('/');
    router.refresh();
  };

  return <Login onLoginSuccess={handleLoginSuccess} />;
}
