import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Home, User, LogOut, Settings, BarChart3, Shield, Heart, Camera, PlusCircle, Bookmark, MessageSquare, HeadphonesIcon, X, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useRef } from 'react';
import { AuthSlidePanel } from './AuthSlidePanel';
export const Navbar = () => {
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [buyMenuOpen, setBuyMenuOpen] = useState(false);
  const buyMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const user = auth?.user;

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', user.id)
        .eq('read', false);
      setUnreadMessages(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('messages-unread-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `recipient_user_id=eq.${user.id}`,
      }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Guard against auth context not being ready
  if (!auth || auth.loading) {
    return <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <div className="animate-pulse h-8 w-20 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </nav>;
  }

  const { profile, signOut } = auth;
  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully."
    });
    navigate('/');
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'agent':
        return 'default';
      default:
        return 'secondary';
    }
  };
  return <nav className="relative border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 shrink-0">
            <Home className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">Oracle Estates</span>
          </Link>
          {profile?.role !== 'customer_support' ? (
            <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
              <div
                className="relative"
                onMouseEnter={() => {
                  if (buyMenuTimeout.current) clearTimeout(buyMenuTimeout.current);
                  setBuyMenuOpen(true);
                }}
              >
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Buy</Button>
              </div>
              <Link to="/rent" onMouseEnter={() => setBuyMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Rent</Button>
              </Link>
              <Link to="/find-agents" onMouseEnter={() => setBuyMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Find agents</Button>
              </Link>
            </nav>
          ) : (
            <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
              <Link to="/purchase">
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Buy</Button>
              </Link>
              <Link to="/rent">
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Rent</Button>
              </Link>
              <Link to="/support-portal">
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Support Portal</Button>
              </Link>
            </nav>
          )}

          <div className="flex items-center space-x-4">
            {user ? <>
                <Link to="/messages" className="hidden md:flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative">
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages</span>
                  {unreadMessages > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-3 h-4 w-4 flex items-center justify-center p-0 text-[10px]">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </Badge>
                  )}
                </Link>
                
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-1.5 rounded-full" onClick={() => setProfilePanelOpen(true)}>
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">My Oracle</span>
                </Button>
              </> : <Button onClick={() => setAuthPanelOpen(true)}>Sign In</Button>}
          </div>
        </div>
      </div>

      {/* Buy Mega Menu */}
      {buyMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setBuyMenuOpen(false)}
          />
          <div
            className="absolute left-0 right-0 top-full bg-background border-b border-border shadow-lg z-50"
            style={{ height: '25vh' }}
          >
            <div className="container mx-auto px-4 py-6 flex flex-col justify-center h-full space-y-2">
              <Link
                to="/purchase"
                onClick={() => setBuyMenuOpen(false)}
                className="block px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Property for sale
              </Link>
              <Link
                to="/new-homes"
                onClick={() => setBuyMenuOpen(false)}
                className="block px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                New homes for sale
              </Link>
              <Link
                to="/agent-valuation"
                onClick={() => setBuyMenuOpen(false)}
                className="block px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Property valuation request
              </Link>
            </div>
          </div>
        </>
      )}

      {createPortal(
        <>
          {profilePanelOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
              style={{ zIndex: 9998 }}
              onClick={() => setProfilePanelOpen(false)}
            />
          )}
          <div
            className={`fixed top-0 right-0 h-screen w-full sm:w-[25%] sm:min-w-[320px] border-l border-border shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
              profilePanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ zIndex: 9999, backgroundColor: 'hsl(var(--background))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm font-semibold bg-primary text-primary-foreground">
                    {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {profile?.full_name?.split(' ')[0] || 'User'}
                  </p>
                  {profile?.role && profile.role !== 'user' && (
                    <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs mt-1 w-fit">
                      {profile.role}
                    </Badge>
                  )}
                  <Link to="/my-oracle" onClick={() => setProfilePanelOpen(false)} className="mt-1 text-xs text-primary hover:underline">
                    View My Oracle
                  </Link>
                </div>
              </div>
              <button onClick={() => setProfilePanelOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <Link to="/favorites" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                <Bookmark className="h-4 w-4 text-muted-foreground" />
                <span>Saved</span>
              </Link>
              <Link to="/profile" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Profile</span>
              </Link>
              {profile?.role !== 'customer_support' && (
                <>
                  <Link to="/request-photography" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span>Photography Service</span>
                  </Link>
                  <Link to="/my-listings" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>My Listings</span>
                  </Link>
                  <Link to="/list-property" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                    <PlusCircle className="h-4 w-4 text-muted-foreground" />
                    <span>List Property</span>
                  </Link>
                  {profile?.role === 'user' && (
                    <Link to="/my-viewings" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>My Viewings</span>
                    </Link>
                  )}
                </>
              )}
              {profile?.role === 'admin' && (
                <Link to="/admin" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
              {(profile?.role === 'agent' || profile?.role === 'admin') && (
                <Link to="/agent-portal" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Agent Portal</span>
                </Link>
              )}
              {profile?.role === 'customer_support' && (
                <Link to="/support-portal" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                  <HeadphonesIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Support Portal</span>
                </Link>
              )}

              <Link to="/account-settings" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Account Settings</span>
              </Link>

              <div className="border-t border-border my-3" />

              <button onClick={() => { setProfilePanelOpen(false); handleSignOut(); }} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors w-full text-left">
                <LogOut className="h-4 w-4 text-muted-foreground" />
                <span>Sign out</span>
              </button>
            </nav>
          </div>
        </>,
        document.body
      )}

      <AuthSlidePanel open={authPanelOpen} onClose={() => setAuthPanelOpen(false)} />
    </nav>;
};