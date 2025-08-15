import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth.getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Redirect to appropriate dashboard based on role
  if (session.user.role === 'admin') {
    redirect('/admin');
  } else {
    redirect('/agent');
  }
}