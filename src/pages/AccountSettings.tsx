import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Pencil, X, Check, Phone, ChevronRight, Lock, Trash2, Eye, EyeOff, Mail, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AccountSettings() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Phone editing
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  // Email change
  const [emailStep, setEmailStep] = useState<'idle' | 'form' | 'otp'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Contact preferences
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [savedPropertyAlerts, setSavedPropertyAlerts] = useState(true);

  useEffect(() => {
    if (profile) {
      const parts = profile.full_name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setNewPhone(profile.phone_number || '');
    }
  }, [profile]);

  const handleSaveName = async () => {
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    setSavingName(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error } = await updateProfile({ full_name: fullName });
    setSavingName(false);
    if (error) {
      toast.error('Failed to update name');
    } else {
      toast.success('Name updated successfully');
      setIsEditingName(false);
    }
  };

  const handleCancelName = () => {
    if (profile) {
      const parts = profile.full_name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
    setIsEditingName(false);
  };

  // Phone handlers
  const handleSavePhone = async () => {
    if (!newPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    setSavingPhone(true);
    const { error } = await updateProfile({ phone_number: newPhone.trim() });
    setSavingPhone(false);
    if (error) {
      toast.error('Failed to update phone number');
    } else {
      toast.success('Phone number updated successfully');
      setIsEditingPhone(false);
    }
  };

  const handleCancelPhone = () => {
    setNewPhone(profile?.phone_number || '');
    setIsEditingPhone(false);
  };

  const handleEmailChangeRequest = async () => {
    if (!newEmail.trim()) {
      toast.error('Please enter a new email');
      return;
    }
    if (!currentPassword.trim()) {
      toast.error('Please enter your current password');
      return;
    }

    setSavingEmail(true);

    // Verify current password by attempting sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPassword,
    });

    if (signInError) {
      setSavingEmail(false);
      toast.error('Incorrect password');
      return;
    }

    // Request email change - Supabase sends a confirmation to the new email
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingEmail(false);

    if (error) {
      toast.error(error.message || 'Failed to request email change');
    } else {
      toast.success('A verification code has been sent to your new email');
      setEmailStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setSavingEmail(true);
    const { error } = await supabase.auth.verifyOtp({
      email: newEmail,
      token: otpCode,
      type: 'email_change',
    });
    setSavingEmail(false);

    if (error) {
      toast.error(error.message || 'Invalid verification code');
    } else {
      toast.success('Email changed successfully');
      setEmailStep('idle');
      setNewEmail('');
      setCurrentPassword('');
      setOtpCode('');
    }
  };

  const handleCancelEmailChange = () => {
    setEmailStep('idle');
    setNewEmail('');
    setCurrentPassword('');
    setOtpCode('');
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.error('Please enter your password');
      return;
    }
    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-own-account', {
        body: { password: deletePassword },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setDeletingAccount(false);
        return;
      }
      toast.success('Your account has been deleted');
      await signOut();
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
      setDeletingAccount(false);
    }
  };

  if (!profile || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Account Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Full Name */}
          <div>
            <Label className="text-sm text-muted-foreground">Full Name</Label>
            {isEditingName ? (
              <div className="mt-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-xs">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={savingName}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={savingName}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveName} disabled={savingName}>
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Save</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelName} disabled={savingName}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-medium text-foreground">{profile.full_name || 'Not set'}</p>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingName(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Email Change */}
          <div>
            <Label className="text-sm text-muted-foreground">Email</Label>
            {emailStep === 'idle' && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-medium text-foreground">{user.email}</p>
                <Button size="sm" variant="ghost" onClick={() => setEmailStep('form')}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}

            {emailStep === 'form' && (
              <div className="mt-2 space-y-3">
                <div>
                  <Label htmlFor="newEmail" className="text-xs">New Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    disabled={savingEmail}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="currentPassword" className="text-xs">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    disabled={savingEmail}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEmailChangeRequest} disabled={savingEmail}>
                    {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Verification Code'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEmailChange} disabled={savingEmail}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {emailStep === 'otp' && (
              <div className="mt-2 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to <span className="font-medium text-foreground">{newEmail}</span>
                </p>
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleVerifyOtp} disabled={savingEmail || otpCode.length !== 6}>
                    {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Change Email'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEmailChange} disabled={savingEmail}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Phone Number Change */}
          <div>
            <Label className="text-sm text-muted-foreground">Phone Number</Label>
            {isEditingPhone ? (
              <div className="mt-2 space-y-3">
                <Input
                  id="newPhone"
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Enter new phone number"
                  disabled={savingPhone}
                  className="mt-1"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSavePhone} disabled={savingPhone}>
                    {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Save</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelPhone} disabled={savingPhone}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-medium text-foreground">{profile.phone_number || 'Not set'}</p>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingPhone(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Contact Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Marketing Emails</p>
                <p className="text-xs text-muted-foreground">Receive promotional emails and offers</p>
              </div>
            </div>
            <Switch
              checked={marketingEmails}
              onCheckedChange={setMarketingEmails}
            />
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Saved Property Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified about updates on your saved properties</p>
              </div>
            </div>
            <Switch
              checked={savedPropertyAlerts}
              onCheckedChange={setSavedPropertyAlerts}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Account Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            onClick={() => navigate('/change-password')}
            className="w-full flex items-center justify-between py-3 px-1 hover:bg-muted/50 rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Change Password</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="border-t border-border" />

          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full flex items-center justify-between py-3 px-1 hover:bg-destructive/10 rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Delete Account</span>
            </div>
            <ChevronRight className="h-4 w-4 text-destructive" />
          </button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All your data will be deleted, including your listings, viewings, messages, and account information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="deletePassword" className="text-sm">Enter your password to confirm</Label>
            <div className="relative">
              <Input
                id="deletePassword"
                type={showDeletePassword ? 'text' : 'password'}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your current password"
                disabled={deletingAccount}
              />
              <button
                type="button"
                onClick={() => setShowDeletePassword(!showDeletePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletingAccount}
              onClick={() => { setDeletePassword(''); setShowDeletePassword(false); }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || !deletePassword.trim()}
            >
              {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
