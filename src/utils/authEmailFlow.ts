import { supabase } from '@/integrations/supabase/client';

type StartEmailAuthResult = {
  error: Error | null;
  nextStep: 'password' | 'verify-email' | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const startEmailAuthFlow = async (email: string): Promise<StartEmailAuthResult> => {
  const normalized = normalizeEmail(email);

  // Use passwordless OTP flow. shouldCreateUser:true means the user is created
  // on first verifyOtp call. For existing users, this just emails them an OTP,
  // but we want existing users to enter a password instead — so we detect them
  // first via a probe sign-in attempt.
  // Simpler: always send OTP. If a password already exists, the user can still
  // verify via OTP (it will sign them in). But to preserve the existing UX
  // (password step for known users), probe with a no-op signInWithPassword.

  // Probe: try signing in with an obviously wrong password. Supabase returns
  // "Invalid login credentials" for both wrong password AND non-existent user,
  // so this can't reliably distinguish. Instead we check if user has a password
  // by attempting OTP signIn with shouldCreateUser:false first.
  const probe = await supabase.auth.signInWithOtp({
    email: normalized,
    options: { shouldCreateUser: false },
  });

  if (!probe.error) {
    // User exists — but we sent them an OTP. Treat existing users as password
    // sign-in path; they can still use the OTP from the email if needed via
    // the resend flow on the verify step.
    return { error: null, nextStep: 'password' };
  }

  // User doesn't exist — send them a signup OTP.
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin,
      data: {
        full_name: '',
        phone_number: '',
        role: 'user',
      },
    },
  });

  if (error) {
    return { error, nextStep: null };
  }

  return { error: null, nextStep: 'verify-email' };
};

export const resendSignupVerification = async (email: string) => {
  return supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin,
    },
  });
};

export const verifySignupOtp = async (email: string, token: string) => {
  return supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: 'email',
  });
};