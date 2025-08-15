import { auth } from '@/lib/auth';
import { getPendingDevices, getAllDevices } from '@/lib/actions';
import { redirect } from 'next/navigation';
import AdminDashboard from './dashboard';

export default async function AdminPage() {
  const session = await auth.getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  if (session.user.role !== 'admin') {
    // If agent tries to access admin page, redirect to agent dashboard
    redirect('/agent');
  }

  const [pendingDevices, allDevices] = await Promise.all([
    getPendingDevices(),
    getAllDevices(),
  ]);

  return (
    <AdminDashboard 
      user={session.user} 
      pendingDevices={pendingDevices}
      allDevices={allDevices}
    />
  );
}
