import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type StartEmailAuthResult = {
  error: Error | null;
  nextStep: 'password' | 'verify-email' | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const buildTemporaryPassword = () => `Tmp#${crypto.randomUUID()}aA1`;

const isExistingUser = (user: User | null) => Array.isArray(user?.identities) && user.identities.length === 0;

export const startEmailAuthFlow = async (email: string): Promise<StartEmailAuthResult> => {
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password: buildTemporaryPassword(),
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        full_name: '',
        phone_number: '',
        role: 'user',
      },
    },
  });

  if (error) {
    if (/already registered|already been registered|user already exists/i.test(error.message)) {
      return { error: null, nextStep: 'password' };
    }

    return { error, nextStep: null };
  }

  return {
    error: null,
    nextStep: isExistingUser(data.user) ? 'password' : 'verify-email',
  };
};

export const resendSignupVerification = async (email: string) => {
  return supabase.auth.resend({
    type: 'signup',
    email: normalizeEmail(email),
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
};

export const verifySignupOtp = async (email: string, token: string) => {
  return supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: 'signup',
  });
};