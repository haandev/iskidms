import { auth } from '@/lib/auth';
import { getCurrentUserDevices } from '@/lib/actions';
import { redirect } from 'next/navigation';
import AgentDashboard from './dashboard';

export default async function AgentPage() {
  const session = await auth.getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  if (session.user.role !== 'agent') {
    // If admin tries to access agent page, redirect to admin dashboard
    redirect('/admin');
  }

  const devices = await getCurrentUserDevices();

  return (
    <AgentDashboard 
      user={session.user} 
      devices={devices} 
    />
  );
}
