import { auth } from '@/lib/auth';
import { getPendingDevices, getAllDevices, getAllAgents } from '@/lib/actions';
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

  const [pendingDevices, allDevices, allAgents] = await Promise.all([
    getPendingDevices(),
    getAllDevices(),
    getAllAgents(),
  ]);

  return (
    <AdminDashboard 
      user={session.user} 
      pendingDevices={pendingDevices}
      allDevices={allDevices}
      allAgents={allAgents}
    />
  );
}
