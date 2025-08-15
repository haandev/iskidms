import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RegisterForm from './register-form';

export default async function RegisterPage() {
  const session = await auth.getSession();
  
  if (session) {
    // Already logged in, redirect to appropriate dashboard
    if (session.user.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/agent');
    }
  }

  return <RegisterForm />;
}