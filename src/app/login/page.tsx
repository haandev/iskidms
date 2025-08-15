import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginForm from './login-form';

export default async function LoginPage() {
  const session = await auth.getSession();
  
  if (session) {
    // Already logged in, redirect to appropriate dashboard
    if (session.user.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/agent');
    }
  }

  return <LoginForm />;
}