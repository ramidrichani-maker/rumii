import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  role: 'user' | 'agent' | 'admin' | 'agency_manager' | 'customer_support';
  agency_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: { full_name: string; phone_number: string; role: string }) => Promise<{ error: any; isExistingUser: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile + start session tracking outside of onAuthStateChange to
  // avoid deadlocking the supabase auth client during OTP verification.
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const userId = user.id;

    (async () => {
      try {
        await supabase.rpc('start_user_session', {
          _user_id: userId,
          _ip_address: null,
          _user_agent: navigator.userAgent,
        });
      } catch (error) {
        console.error('Error starting user session:', error);
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!cancelled) setProfile(profileData);
    })();

    return () => {
      cancelled = true;
      (async () => {
        try {
          await supabase.rpc('end_user_session', { _user_id: userId });
        } catch (error) {
          console.error('Error ending user session:', error);
        }
      })();
    };
  }, [user?.id]);

  const signUp = async (email: string, password: string, userData: { full_name: string; phone_number: string; role: string }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });

    const isExistingUser =
      !error &&
      !!data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0;

    return { error, isExistingUser };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    // End user session before signing out
    if (user?.id) {
      try {
        await supabase.rpc('end_user_session', {
          _user_id: user.id
        });
      } catch (error) {
        console.error('Error ending user session:', error);
      }
    }
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: { message: 'No user logged in' } };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);
    
    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }
    
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};