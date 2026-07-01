import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Home, User, LogOut, Settings, BarChart3, Shield, Heart, Camera, PlusCircle, Bookmark, MessageSquare, HeadphonesIcon, X, Eye, Menu, Mail } from 'lucide-react';
import rumiLogo from '@/assets/rumi-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useRef } from 'react';
import { AuthSlidePanel } from './AuthSlidePanel';
export const Navbar = () => {
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'buy' | 'rent' | 'commercial' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = (menu: 'buy' | 'rent' | 'commercial') => {
    if (menuCloseTimeout.current) clearTimeout(menuCloseTimeout.current);
    setActiveMenu(menu);
  };

  const scheduleClose = () => {
    if (menuCloseTimeout.current) clearTimeout(menuCloseTimeout.current);
    menuCloseTimeout.current = setTimeout(() => setActiveMenu(null), 150);
  };

  const cancelClose = () => {
    if (menuCloseTimeout.current) clearTimeout(menuCloseTimeout.current);
  };

  const closeMenu = () => {
    if (menuCloseTimeout.current) clearTimeout(menuCloseTimeout.current);
    setActiveMenu(null);
  };

  // Close dropdown on click outside (replaces backdrop overlay that caused flickering)
  useEffect(() => {
    if (!activeMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (navRef.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);
  const navRef = useRef<HTMLElement>(null);
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
  return <nav ref={navRef} className="relative border-b bg-background" style={{ zIndex: 50, overflow: 'visible' }}>
      <div className="container mx-auto px-4 py-3 bg-destructive-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 shrink-0">
            <button
              className="md:hidden p-1.5 text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center space-x-2">
              <img src={rumiLogo} alt="Rumi" className="w-[42px] h-[42px] object-contain self-center" />
              <span className="text-xl font-bold text-muted-foreground leading-none self-center">rumi</span>
            </Link>
          </div>
          {profile?.role !== 'customer_support' ? (
            <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
              <div
                className="relative"
                onMouseEnter={() => openMenu('buy')}
                onMouseLeave={scheduleClose}
                onClick={() => setActiveMenu(prev => prev === 'buy' ? null : 'buy')}
              >
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Buy</Button>
              </div>
              <Link to="/rent" onMouseEnter={() => closeMenu()}>
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Rent</Button>
              </Link>
              <Link to="/find-agents" onMouseEnter={() => closeMenu()}>
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Find agents</Button>
              </Link>
              <div
                className="relative"
                onMouseEnter={() => openMenu('commercial')}
                onMouseLeave={scheduleClose}
                onClick={() => setActiveMenu(prev => prev === 'commercial' ? null : 'commercial')}
              >
                <Button variant="ghost" size="sm" className="text-[1.05rem]">Commercial</Button>
              </div>
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
                {/* Desktop My rumi */}
                <Button variant="ghost" className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full" onClick={() => setProfilePanelOpen(true)}>
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">My rumi</span>
                </Button>

                {/* Mobile My Rumi */}
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-full" onClick={() => setProfilePanelOpen(true)}>
                  <User className="h-5 w-5" />
                </Button>
              </> : <>
                {/* Desktop Sign In */}
                <Button className="hidden md:inline-flex" onClick={() => setAuthPanelOpen(true)}>Sign In</Button>

                {/* Mobile Sign In */}
                <button
                  className="md:hidden flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setAuthPanelOpen(true)}
                >
                  <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-medium leading-none">Sign in</span>
                </button>
              </>}
          </div>
        </div>
      </div>

      {/* Mega Menus */}
      {activeMenu && (
        <div
          className="absolute left-0 right-0 border-b border-border shadow-lg"
          style={{ 
            zIndex: 9001, 
            backgroundColor: '#f0f0f0',
            top: '100%',
            marginTop: '-10px',
            paddingTop: '10px',
            height: '120px',
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="w-full h-full flex items-center justify-center gap-8 px-4">
            {activeMenu === 'buy' && (
              <>
                <Link to="/purchase" onClick={closeMenu} className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors">
                  Property for sale
                </Link>
                <Link to="/agent-valuation" onClick={closeMenu} className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors">
                  Property valuation request
                </Link>
              </>
            )}
            {activeMenu === 'commercial' && (
              <>
                <Link to="/rent?type=commercial" onClick={closeMenu} className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors">
                  Commercial property to rent
                </Link>
                <Link to="/purchase?type=commercial" onClick={closeMenu} className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors">
                  Commercial property for sale
                </Link>
                <Link to="/advertise-commercial" onClick={closeMenu} className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors">
                  Advertise commercial property
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {createPortal(
        <>
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity md:hidden"
              style={{ zIndex: 9996 }}
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
          <div
            className={`fixed top-0 left-0 h-screen w-[280px] border-r border-border shadow-2xl transition-transform duration-300 ease-in-out flex flex-col md:hidden ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ zIndex: 9997, backgroundColor: 'hsl(var(--background))' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center space-x-2">
                <Home className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold">Rumi</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-4">
              {profile?.role === 'customer_support' ? (
                <>
                  <Link to="/purchase" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent">Buy</Link>
                  <Link to="/rent" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent">Rent</Link>
                  <Link to="/support-portal" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent">Support Portal</Link>
                </>
              ) : (
                <>
                  {/* Buy */}
                  <div className="space-y-1">
                    <p className="px-3 py-2 text-sm font-semibold text-foreground">Buy</p>
                    <Link to="/purchase" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Property for sale
                    </Link>
                    <Link to="/agent-valuation" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Property valuation request
                    </Link>
                  </div>

                  {/* Rent */}
                  <Link to="/rent" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-semibold text-foreground hover:bg-accent">
                    Rent
                  </Link>

                  {/* Find agents */}
                  <div>
                    <Link to="/find-agents" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm font-semibold text-foreground hover:bg-accent">
                      Find agents
                    </Link>
                  </div>

                  {/* Commercial */}
                  <div className="space-y-1">
                    <p className="px-3 py-2 text-sm font-semibold text-foreground">Commercial</p>
                    <Link to="/rent?type=commercial" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Commercial property to rent
                    </Link>
                    <Link to="/purchase?type=commercial" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Commercial property for sale
                    </Link>
                    <Link to="/advertise-commercial" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Advertise commercial property
                    </Link>
                  </div>
                </>
              )}
            </nav>
          </div>
        </>,
        document.body
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
                  <Link to="/my-rumi" onClick={() => setProfilePanelOpen(false)} className="mt-1 text-xs text-primary hover:underline">
                    View My rumi
                  </Link>
                </div>
              </div>
              <button onClick={() => setProfilePanelOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <Link to="/messages" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors relative">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>Messages</span>
                {unreadMessages > 0 && (
                  <Badge variant="destructive" className="ml-auto h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[10px]">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </Badge>
                )}
              </Link>
              <Link to="/favorites" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span>Saved</span>
              </Link>
              <Link to="/my-rumi?section=enquiries" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-accent transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>Enquiries</span>
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
                    <span>My places</span>
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