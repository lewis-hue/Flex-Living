import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import flexLogo from '@/assets/flex-logo.webp';
import { PasswordInput } from '@/components/ui/password-input';

const SignUp = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    role: 'manager'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { signup, sendVerification, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate password match
      if (formData.password !== formData.confirm_password) {
        toast.error('Passwords do not match');
        return;
      }

      // Validate password strength
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }

      const result = await signup(formData);
      setVerificationEmail(result.email);
      setShowVerification(true);
      toast.success('Account created! Please check your email for verification code.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      await verifyEmail(verificationEmail, verificationCode);
      toast.success('Email verified successfully! Welcome to Reviews HQ!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await sendVerification(verificationEmail);
      toast.success('Verification code sent to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
    }
  };

  if (showVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4">
              <img src={flexLogo} alt="Reviews HQ" className="h-24 w-auto" />
            </div>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              Enter the verification code sent to {verificationEmail}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification_code">Verification Code</Label>
                <Input
                  id="verification_code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  required
                  disabled={isVerifying}
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={isVerifying}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleResendVerification}
                  disabled={isVerifying}
                >
                  Resend Code
                </Button>
              </div>
            </form>
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setShowVerification(false)}
                disabled={isVerifying}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign Up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <img src={flexLogo} alt="Reviews HQ" className="h-24 w-auto" />
          </div>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join Reviews HQ to manage your properties</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <PasswordInput
                id="confirm_password"
                placeholder="Confirm your password"
                value={formData.confirm_password}
                onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange('role', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Property Manager</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;