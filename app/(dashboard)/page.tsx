'use client';

import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <Dashboard
      databaseCount={0}
      tableCount={0}
      currentDatabase="default"
      activities={[]}
      onCreateDatabase={() => {}}
      onCreateTable={() => {}}
      onOpenSqlEditor={() => router.push('/query')}
    />
  );
}
