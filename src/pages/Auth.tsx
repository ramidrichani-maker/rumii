import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone_number: '',
    country: 'lb',
    role: 'user'
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleChange = (value: string) => {
    setFormData({
      ...formData,
      role: value
    });
  };

  const handleCountryChange = (value: string) => {
    setFormData({
      ...formData,
      country: value
    });
  };

  const getCountryCode = (countryCode: string) => {
    const codes: { [key: string]: string } = {
      us: '+1', ca: '+1', uk: '+44', au: '+61', de: '+49', fr: '+33',
      es: '+34', it: '+39', nl: '+31', se: '+46', no: '+47', dk: '+45',
      mt: '+356', jp: '+81', sg: '+65', hk: '+852', lb: '+961'
    };
    return codes[countryCode] || '+961';
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link and a 6-digit verification code.",
        });
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords do not match",
            variant: "destructive"
          });
          return;
        }

        if (!formData.full_name || !formData.phone_number) {
          toast({
            title: "Error",
            description: "Please fill in all required fields",
            variant: "destructive"
          });
          return;
        }

        const { error } = await signUp(formData.email, formData.password, {
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          role: formData.role
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Success!",
            description: "Account created successfully. Please check your email for verification.",
          });
          navigate('/');
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Sign in failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Sign in failed",
              description: error.message,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You have been signed in successfully.",
          });
          navigate('/');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {showForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Sign In')}
            </CardTitle>
            <CardDescription className="text-center">
              {showForgotPassword
                ? 'Enter your email to receive a password reset link'
                : (isSignUp 
                  ? 'Enter your details to create your account' 
                  : 'Enter your email and password to sign in')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="john@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                  }}
                >
                  Back to Sign In
                </Button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select value={formData.country} onValueChange={handleCountryChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lb">🇱🇧 Lebanon (+961)</SelectItem>
                          <SelectItem value="us">🇺🇸 United States (+1)</SelectItem>
                          <SelectItem value="uk">🇬🇧 United Kingdom (+44)</SelectItem>
                          <SelectItem value="ca">🇨🇦 Canada (+1)</SelectItem>
                          <SelectItem value="au">🇦🇺 Australia (+61)</SelectItem>
                          <SelectItem value="de">🇩🇪 Germany (+49)</SelectItem>
                          <SelectItem value="fr">🇫🇷 France (+33)</SelectItem>
                          <SelectItem value="es">🇪🇸 Spain (+34)</SelectItem>
                          <SelectItem value="it">🇮🇹 Italy (+39)</SelectItem>
                          <SelectItem value="nl">🇳🇱 Netherlands (+31)</SelectItem>
                          <SelectItem value="se">🇸🇪 Sweden (+46)</SelectItem>
                          <SelectItem value="no">🇳🇴 Norway (+47)</SelectItem>
                          <SelectItem value="dk">🇩🇰 Denmark (+45)</SelectItem>
                          <SelectItem value="mt">🇲🇹 Malta (+356)</SelectItem>
                          <SelectItem value="jp">🇯🇵 Japan (+81)</SelectItem>
                          <SelectItem value="sg">🇸🇬 Singapore (+65)</SelectItem>
                          <SelectItem value="hk">🇭🇰 Hong Kong (+852)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <div className="flex gap-2">
                        <div className="w-20 px-3 py-2 bg-muted rounded-md text-sm text-center">
                          {getCountryCode(formData.country)}
                        </div>
                        <Input
                          id="phone_number"
                          name="phone_number"
                          type="tel"
                          placeholder="123-456-7890"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          className="flex-1"
                          required
                        />
                      </div>
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Account Type</Label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
              </Button>

              {!isSignUp && (
                <div className="mt-2 text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm p-0 h-auto font-normal"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>
                  )}
                </form>

                {!showForgotPassword && (
                  <div className="mt-4 text-center text-sm">
                    {isSignUp ? (
                      <>
                        Already have an account?{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto font-normal"
                          onClick={() => setIsSignUp(false)}
                        >
                          Sign in
                        </Button>
                      </>
                    ) : (
                      <>
                        Don't have an account?{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto font-normal"
                          onClick={() => setIsSignUp(true)}
                        >
                          Sign up
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;