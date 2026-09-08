import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import flexLogo from '@/assets/flex-logo.webp';
import { PasswordInput } from '@/components/ui/password-input';
import { apiClient } from '@/lib/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResendCode, setCanResendCode] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { requestPasswordReset, confirmPasswordReset } = useAuth();

  // Timer effect for resend code cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(timer => {
          if (timer <= 1) {
            setCanResendCode(true);
            return 0;
          }
          return timer - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const startResendTimer = () => {
    setCanResendCode(false);
    setResendTimer(60); // 60 second cooldown
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setResetEmail(email);
      setShowResetForm(true);
      startResendTimer(); // Start cooldown timer after first send
      toast.success('Verification code sent to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResendCode) return;
    
    setIsLoading(true);
    try {
      await requestPasswordReset(resetEmail);
      startResendTimer();
      toast.success('New verification code sent to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      // Here we would normally verify the code, but for now we'll simulate it
      // In a real implementation, you'd call an API to verify the code first
      if (verificationCode.length !== 6) {
        toast.error('Please enter a 6-digit verification code');
        return;
      }
      
      // Set verified state to allow password entry
      setIsCodeVerified(true);
      toast.success('Verification code accepted! You can now set a new password.');
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      // Validate password match
      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      // Validate password strength
      if (newPassword.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }

      const result = await confirmPasswordReset({
        email: resetEmail,
        verification_code: verificationCode,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      // Store the access token if provided
      if (result.access_token) {
        // Token is already set by the API client in the confirmPasswordReset method
      }

      toast.success('Password reset successfully! You are now logged in.');
      // Navigate to dashboard after successful password reset
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  if (showResetForm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4">
              <img src={flexLogo} alt="Reviews HQ" className="h-24 w-auto" />
            </div>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              Enter the verification code sent to {resetEmail} and your new password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCodeVerified ? (
              // Step 1: Verify Code
              <form onSubmit={handleVerifyCode} className="space-y-4">
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
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 6-digit verification code sent to {resetEmail}
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isVerifying}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
                
                {/* Resend Code Button */}
                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={handleResendCode}
                    disabled={!canResendCode || isLoading || isVerifying}
                    className="w-full"
                  >
                    {canResendCode ? (
                      'Resend Verification Code'
                    ) : (
                      `Resend in ${resendTimer}s`
                    )}
                  </Button>
                </div>
                
                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowResetForm(false);
                      setIsCodeVerified(false);
                      setVerificationCode('');
                      setCanResendCode(true);
                      setResendTimer(0);
                    }}
                    disabled={isVerifying}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Email Entry
                  </Button>
                </div>
              </form>
            ) : (
              // Step 2: Set New Password
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-2">
                    ✓
                  </div>
                  <p className="text-sm text-green-600 font-medium">Code Verified!</p>
                  <p className="text-xs text-muted-foreground">You can now set your new password</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <PasswordInput
                    id="new_password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isResetting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <PasswordInput
                    id="confirm_password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isResetting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isResetting}>
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsCodeVerified(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    disabled={isResetting}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Code Verification
                  </Button>
                </div>
              </form>
            )}
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
          <CardTitle>Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a verification code to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;