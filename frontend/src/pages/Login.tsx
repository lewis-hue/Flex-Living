import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import flexLogo from '@/assets/flex-logo.webp';
import { PasswordInput } from '@/components/ui/password-input';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('🚀 Login form submitted');
      console.log('📧 Email:', email);
      console.log('🔑 Password length:', password.length);
      console.log('🌐 API URL being used:', process.env.VITE_API_URL);
      
      const user = await login(email, password);
      console.log('✅ Login successful, user:', user);
      
      toast.success('Welcome back!');
      
      // Add a small delay to ensure state is properly set
      setTimeout(() => {
        console.log('🧭 Navigating to dashboard...');
        navigate('/dashboard', { replace: true });
      }, 100);
      
    } catch (error) {
      console.error('❌ Login form error:', error);
      const errorMessage = (error as Error).message;
      console.error('🚨 Error message:', errorMessage);
      
      if (errorMessage.includes('verify your email')) {
        toast.error('Please verify your email address before logging in. Check your email for verification code.');
      } else {
        toast.error('Invalid credentials. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <img src={flexLogo} alt="Reviews HQ" className="h-24 w-auto" />
          </div>
          <CardDescription>Manager Dashboard Login</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Forgot your password?{' '}
              <Link to="/forgot-password" className="text-primary hover:underline">
                Reset it here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
