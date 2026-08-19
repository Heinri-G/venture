import { Link, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthShell from './components/auth/AuthShell';

export default function VerifyEmail() {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  return (
    <AuthShell
      icon={<Mail className="size-6" />}
      title="Verify your email"
      description={
        email
          ? `We've sent a confirmation link to ${email}. Check your inbox and spam folder to activate your account.`
          : 'Check your inbox and spam folder for a confirmation link to activate your account.'
      }
      footer={
        <p className="text-sm text-muted-foreground">
          Already verified?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div />
    </AuthShell>
  );
}
