import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X, Eye, EyeOff, ArrowLeft } from 'lucide-react';

type Step = 'email' | 'password' | 'verify-email' | 'create-account' | 'forgot-password' | 'reset-password';

interface AuthSlidePanelProps {
  open: boolean;
  onClose: () => void;
}

export const AuthSlidePanel = ({ open, onClose }: AuthSlidePanelProps) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const resetState = () => {
    setStep('email');
    setEmail('');
    setPassword('');
    setOtp('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetEmail('');
    setShowPassword(false);
    setShowNewPassword(false);
    setStaySignedIn(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleContinueEmail = async () => {
    if (!email.trim()) {
      toast({ title: 'Email required', description: 'Please enter your email address.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      // Try signInWithOtp with shouldCreateUser: false
      // If user doesn't exist, this will return an error
      const { error: otpProbe } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false }
      });

      if (otpProbe) {
        // User doesn't exist — send verification OTP for new user
        await sendVerificationOtp();
        setStep('verify-email');
      } else {
        // User exists — ask for password
        setStep('password');
      }
    } catch {
      await sendVerificationOtp();
      setStep('verify-email');
    } finally {
      setIsLoading(false);
    }
  };

  const sendVerificationOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      }
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Verification code sent', description: `A 6-digit code has been sent to ${email}` });
    }
  };

  const handleSignIn = async () => {
    if (!password) {
      toast({ title: 'Password required', description: 'Please enter your password.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({ title: 'Sign in failed', description: 'Invalid email or password.', variant: 'destructive' });
        } else if (error.message.includes('Email not confirmed')) {
          toast({ title: 'Email not verified', description: 'Please verify your email first.', variant: 'destructive' });
        } else {
          toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Welcome back!', description: 'You have been signed in successfully.' });
        handleClose();
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setResetEmail(email);
        toast({ title: 'Code sent', description: 'A 6-digit verification code has been sent to your email. It expires in 10 minutes.' });
        setStep('forgot-password');
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Invalid code', description: 'Please enter the 6-digit code.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail || email.trim(),
        token: otp,
        type: 'recovery',
      });
      if (error) {
        toast({ title: 'Invalid code', description: 'The code is invalid or has expired.', variant: 'destructive' });
      } else {
        setStep('reset-password');
        toast({ title: 'Code verified', description: 'You can now set a new password.' });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Passwords don\'t match', description: 'Please make sure passwords match.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
        handleClose();
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Invalid code', description: 'Please enter the 6-digit code.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'email',
      });
      if (error) {
        toast({ title: 'Invalid code', description: 'The code is invalid or has expired.', variant: 'destructive' });
      } else {
        // Email verified, now create account
        setStep('create-account');
        toast({ title: 'Email verified', description: 'Now finish creating your account.' });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password) {
      toast({ title: 'All fields required', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      // User was already created by signInWithOtp + verifyOtp, so update their password and profile
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) {
        toast({ title: 'Error', description: pwError.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Update profile with name and phone
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            phone_number: phone.trim(),
          })
          .eq('user_id', currentUser.id);

        if (profileError) {
          toast({ title: 'Error', description: profileError.message, variant: 'destructive' });
          setIsLoading(false);
          return;
        }
      }

      toast({ title: 'Account created!', description: 'Welcome to Oracle Estates.' });
      handleClose();
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      if (step === 'forgot-password') {
        await supabase.auth.resetPasswordForEmail(resetEmail || email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      } else {
        await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false }
        });
      }
      toast({ title: 'Code resent', description: 'A new code has been sent to your email.' });
    } catch {
      toast({ title: 'Error', description: 'Could not resend code.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const canGoBack = step !== 'email';
  const handleBack = () => {
    if (step === 'password' || step === 'verify-email') setStep('email');
    else if (step === 'forgot-password') setStep('password');
    else if (step === 'reset-password') setStep('forgot-password');
    else if (step === 'create-account') setStep('verify-email');
  };

  return createPortal(
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          style={{ zIndex: 9998 }}
          onClick={handleClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-full sm:w-[25%] sm:min-w-[360px] border-l border-border shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ zIndex: 9999, backgroundColor: 'hsl(var(--background))' }}
      >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              {canGoBack && (
                <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-foreground">
                {step === 'create-account' ? 'Finish creating your account' : 'Sign in or create an account'}
              </h2>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step: Email */}
            {step === 'email' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="auth-email" className="text-sm font-medium text-foreground">Email address</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleContinueEmail()}
                    autoFocus
                  />
                </div>
                <Button className="w-full" onClick={handleContinueEmail} disabled={isLoading}>
                  {isLoading ? 'Checking...' : 'Continue'}
                </Button>
              </div>
            )}

            {/* Step: Password (existing user) */}
            {step === 'password' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Signing in as</p>
                  <p className="text-sm font-medium text-foreground">{email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-password" className="text-sm font-medium text-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stay-signed-in"
                    checked={staySignedIn}
                    onCheckedChange={(checked) => setStaySignedIn(!!checked)}
                  />
                  <Label htmlFor="stay-signed-in" className="text-sm text-muted-foreground cursor-pointer">Stay signed in</Label>
                </div>
                <Button className="w-full" onClick={handleSignIn} disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
                <Button variant="link" className="w-full text-sm p-0 h-auto" onClick={handleForgotPassword} disabled={isLoading}>
                  Forgot password?
                </Button>
              </div>
            )}

            {/* Step: Verify Email (new user) */}
            {step === 'verify-email' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">We've sent a 6-digit code to</p>
                  <p className="text-sm font-medium text-foreground">{email}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-otp" className="text-sm font-medium text-foreground">Verification code</Label>
                  <Input
                    id="auth-otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyEmail()}
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <Button className="w-full" onClick={handleVerifyEmail} disabled={isLoading || otp.length !== 6}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Button>
                <Button variant="link" className="w-full text-sm p-0 h-auto" onClick={handleResendCode} disabled={isLoading}>
                  Resend code
                </Button>
              </div>
            )}

            {/* Step: Create Account */}
            {step === 'create-account' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="auth-firstname" className="text-sm font-medium text-foreground">First name</Label>
                  <Input
                    id="auth-firstname"
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-lastname" className="text-sm font-medium text-foreground">Last name</Label>
                  <Input
                    id="auth-lastname"
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-phone" className="text-sm font-medium text-foreground">Mobile number</Label>
                  <Input
                    id="auth-phone"
                    type="tel"
                    placeholder="+961 XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-create-password" className="text-sm font-medium text-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      id="auth-create-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stay-signed-in-create"
                    checked={staySignedIn}
                    onCheckedChange={(checked) => setStaySignedIn(!!checked)}
                  />
                  <Label htmlFor="stay-signed-in-create" className="text-sm text-muted-foreground cursor-pointer">Stay signed in</Label>
                </div>
                <Button className="w-full" onClick={handleCreateAccount} disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>
              </div>
            )}

            {/* Step: Forgot Password - Enter Code */}
            {step === 'forgot-password' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">We've sent a 6-digit code to</p>
                  <p className="text-sm font-medium text-foreground">{resetEmail || email}</p>
                  <p className="text-xs text-muted-foreground">The code expires in 10 minutes.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-reset-otp" className="text-sm font-medium text-foreground">Verification code</Label>
                  <Input
                    id="auth-reset-otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyResetCode()}
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <Button className="w-full" onClick={handleVerifyResetCode} disabled={isLoading || otp.length !== 6}>
                  {isLoading ? 'Verifying...' : 'Verify code'}
                </Button>
                <Button variant="link" className="w-full text-sm p-0 h-auto" onClick={handleResendCode} disabled={isLoading}>
                  Resend code
                </Button>
              </div>
            )}

            {/* Step: Reset Password - New Password */}
            {step === 'reset-password' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">Enter your new password below.</p>
                <div className="space-y-2">
                  <Label htmlFor="auth-new-password" className="text-sm font-medium text-foreground">New password</Label>
                  <div className="relative">
                    <Input
                      id="auth-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-confirm-new-password" className="text-sm font-medium text-foreground">Confirm new password</Label>
                  <Input
                    id="auth-confirm-new-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                  />
                </div>
                <Button className="w-full" onClick={handleResetPassword} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update password'}
                </Button>
              </div>
            )}
          </div>
      </div>
    </>,
    document.body
  );
};
