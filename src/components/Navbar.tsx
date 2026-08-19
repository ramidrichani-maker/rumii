import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Home, User, LogOut, Settings, BarChart3, Shield, Heart, Camera, PlusCircle, Bookmark, MessageSquare, HeadphonesIcon, X, Eye, Menu, Mail, Map } from 'lucide-react';
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
  const [activeMenu, setActiveMenu] = useState<'properties' | 'services' | null>(null);
  const [closingMenu, setClosingMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const megaNavRef = useRef<HTMLElement>(null);
  const propertiesTextRef = useRef<HTMLSpanElement>(null);
  const servicesTextRef = useRef<HTMLSpanElement>(null);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, top: 0, opacity: 0 });


  const openMenuImmediate = (menu: 'properties' | 'services') => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setClosingMenu(false);
    setActiveMenu(menu);
  };

  const closeMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!activeMenu || closingMenu) return;
    setClosingMenu(true);
    closeTimer.current = setTimeout(() => {
      setActiveMenu(null);
      setClosingMenu(false);
    }, 325);
  };

  const toggleMenu = (menu: 'properties' | 'services') => {
    if (activeMenu === menu && !closingMenu) {
      closeMenu();
    } else {
      openMenuImmediate(menu);
    }
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

  // Measure & animate the sliding underline under the active menu button
  useEffect(() => {
    const measure = () => {
      const nav = megaNavRef.current;
      const txt = activeMenu === 'properties' ? propertiesTextRef.current : servicesTextRef.current;
      if (!nav || !txt || !activeMenu || closingMenu) {
        setUnderlineStyle(s => ({ ...s, opacity: 0 }));
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const txtRect = txt.getBoundingClientRect();
      setUnderlineStyle({
        left: txtRect.left - navRect.left,
        width: txtRect.width,
        top: txtRect.bottom - navRect.top - 1,
        opacity: 1,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeMenu, closingMenu]);

  const navRef = useRef<HTMLElement>(null);
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [hidden, setHidden] = useState(false);

  // Hide navbar on scroll down, reveal on scroll up
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const delta = y - lastY;
        if (Math.abs(delta) < 6) return;
        if (delta > 0 && y > 80) {
          setHidden(true);
        } else if (delta < 0) {
          setHidden(false);
        }
        lastY = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Close any open mega menu when the bar hides
  useEffect(() => {
    if (hidden && activeMenu && !closingMenu) closeMenu();
  }, [hidden]);

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
  return <nav ref={navRef} className={`sticky top-0 border-b bg-background transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`} style={{ zIndex: 9990, overflow: 'visible' }}>
      <div className="w-full max-w-[2520px] mx-auto px-4 py-[1.58rem] bg-destructive-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 shrink-0">
            <button
              className="md:hidden p-1.5 text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center space-x-2">
              <img src={rumiLogo} alt="Rumi" className="w-[42px] h-[42px] object-contain self-center" />
            </Link>
            <span className="hidden md:inline-block text-foreground/30 text-lg font-light leading-none select-none pb-0.5">|</span>
            {profile?.role !== 'customer_support' ? (
            <nav ref={megaNavRef} className="hidden md:flex items-center space-x-5 ml-1 pt-1.5 relative">
                <div onClick={() => toggleMenu('properties')}>
                  <Button variant="ghost" size="sm" className="text-[0.9rem] font-['Arial',sans-serif] font-medium tracking-wide text-black hover:text-black/40 transition-colors hover:bg-transparent"><span ref={propertiesTextRef}>Properties</span></Button>
                </div>
                <div onClick={() => toggleMenu('services')}>
                  <Button variant="ghost" size="sm" className="text-[0.9rem] font-['Arial',sans-serif] font-medium tracking-wide text-black hover:text-black/40 transition-colors hover:bg-transparent"><span ref={servicesTextRef}>Services</span></Button>
                </div>
                <span className="absolute h-0.5 bg-foreground pointer-events-none transition-all duration-300 ease-out" style={{ left: underlineStyle.left, width: underlineStyle.width, top: underlineStyle.top, opacity: underlineStyle.opacity, marginLeft: 0 }} />
              </nav>
            ) : (
              <nav className="hidden md:flex items-center space-x-5 ml-1 pt-1.5">
                <Link to="/purchase">
                  <Button variant="ghost" size="sm" className="text-[0.85rem] font-display tracking-wide">Buy</Button>
                </Link>
                <Link to="/rent">
                  <Button variant="ghost" size="sm" className="text-[0.85rem] font-display tracking-wide">Rent</Button>
                </Link>
                <Link to="/support-portal">
                  <Button variant="ghost" size="sm" className="text-[0.85rem] font-display tracking-wide">Support Portal</Button>
                </Link>
              </nav>
            )}
          </div>

          <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center">
            <span className="text-3xl font-title leading-none" style={{ color: '#0a0a0a' }}>rUMı</span>
          </Link>

          <div className="flex items-center space-x-4">
            {user ? <>
                {/* My rumi (icon only) */}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="My rumi"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setProfilePanelOpen(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-muted-foreground">
                    <circle cx="12" cy="7" r="4.5" />
                    <path d="M4 20a8 8 0 0 1 16 0" />
                  </svg>
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <circle cx="12" cy="7" r="4.5" />
                      <path d="M4 20a8 8 0 0 1 16 0" />
                    </svg>
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
          className={`absolute border-b border-border shadow-xl ${closingMenu ? 'animate-mega-menu-slide-up' : 'animate-mega-menu-slide'}`}
          style={{ 
            zIndex: 9001, 
            backgroundColor: '#ffffff',
            top: '100%',
            left: '0',
            width: '100vw',
            height: '80vh',
            borderRadius: '0 0 8px 8px',
            overflow: 'hidden',
            willChange: 'max-height',
          }}
        >
          <div className="w-full h-full flex" style={{ transform: activeMenu === 'services' ? 'translateX(-100%)' : 'translateX(0)', transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' }}>
            {/* Properties panel */}
            <div className="w-full h-full shrink-0 flex flex-col items-start justify-start gap-0 px-6 py-4" style={closingMenu ? { animation: 'mega-menu-content-out 0.3s ease-in both' } : { animation: 'mega-menu-content 0.4s ease-out 0.675s both' }}>
              <div className="w-1/4 ml-[17%] text-center mb-8 mt-4" style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.71s' }}>
                <h2 className="text-2xl leading-none uppercase">
                  <span className="font-[Couture,Playfair_Display,Georgia,serif] font-thin tracking-[0.15em] text-foreground">Our</span>{' '}
                  <span className="italic font-[Bodoni_Moda,Playfair_Display,Georgia,serif] font-light text-foreground">Properties</span>
                </h2>
              </div>
              <Link to="/purchase" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.825s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Buy
              </Link>
              <Link to="/rent" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.875s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Rent
              </Link>
              <Link to="/purchase?type=commercial" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.93s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Commercial sale
              </Link>
              <Link to="/rent?type=commercial" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.98s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Commercial rent
              </Link>
              <Link to="/purchase?type=land" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '1.035s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Land
              </Link>
            </div>
            {/* Services panel */}
            <div className="w-full h-full shrink-0 flex flex-col items-start justify-start gap-0 px-6 py-4" style={closingMenu ? { animation: 'mega-menu-content-out 0.3s ease-in both' } : { animation: 'mega-menu-content 0.4s ease-out 0.675s both' }}>
              <div className="w-1/4 ml-[17%] text-center mb-8 mt-4" style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.71s' }}>
                <h2 className="text-2xl leading-none uppercase">
                  <span className="font-[Couture,Playfair_Display,Georgia,serif] font-thin tracking-[0.15em] text-foreground">Our</span>{' '}
                  <span className="italic font-[Bodoni_Moda,Playfair_Display,Georgia,serif] font-light text-foreground">Services</span>
                </h2>
              </div>
              <Link to="/find-agents" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.825s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Find agents
              </Link>
              <Link to="/agent-valuation" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.875s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Property valuation
              </Link>
              <Link to="/investment-consulting" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.93s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Investment consulting
              </Link>
              <Link to="/request-interior-design" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '0.98s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Interior design
              </Link>
              <Link to="/advertise-commercial" onClick={closeMenu} style={{ animation: closingMenu ? 'none' : 'mega-menu-content 0.4s ease-out both', animationDelay: closingMenu ? '0s' : '1.035s' }} className="w-full text-left px-4 py-0.5 rounded-md text-sm font-[Arial,sans-serif] font-light text-foreground hover:text-muted-foreground/60 transition-colors">
                Advertise commercial property
              </Link>
            </div>
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
                    <p className="px-3 py-2 text-sm font-semibold text-foreground">Properties</p>
                    <Link to="/purchase" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Buy
                    </Link>
                    <Link to="/rent" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Rent
                    </Link>
                    <Link to="/purchase?type=commercial" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Commercial sale
                    </Link>
                    <Link to="/rent?type=commercial" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Commercial rent
                    </Link>
                    <Link to="/purchase?type=land" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Land
                    </Link>
                  </div>

                  {/* Services */}
                  <div className="space-y-1">
                    <p className="px-3 py-2 text-sm font-semibold text-foreground">Services</p>
                    <Link to="/find-agents" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Find agents
                    </Link>
                    <Link to="/agent-valuation" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Property valuation
                    </Link>
                    <Link to="/investment-consulting" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Investment consulting
                    </Link>
                    <Link to="/request-interior-design" onClick={() => setMobileMenuOpen(false)} className="block px-6 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                      Interior design
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
              <Link to="/messages" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors relative">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>Messages</span>
                {unreadMessages > 0 && (
                  <Badge variant="destructive" className="ml-auto h-4 min-w-4 flex items-center justify-center p-0 px-1 text-[10px]">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </Badge>
                )}
              </Link>
              <Link to="/favorites" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span>Saved</span>
              </Link>
              <Link to="/my-rumi?section=enquiries" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>Enquiries</span>
              </Link>
              <Link to="/my-rumi?section=drawn-areas" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                <Map className="h-4 w-4 text-muted-foreground" />
                <span>Drawn areas</span>
              </Link>
              <Link to="/profile" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Profile</span>
              </Link>
              {profile?.role !== 'customer_support' && (
                <>
                  <Link to="/request-photography" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span>Photography Service</span>
                  </Link>
                  <Link to="/my-listings" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>My places</span>
                  </Link>
                  <Link to="/list-property" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                    <PlusCircle className="h-4 w-4 text-muted-foreground" />
                    <span>List Property</span>
                  </Link>
                  {profile?.role === 'user' && (
                    <Link to="/my-viewings" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>My Viewings</span>
                    </Link>
                  )}
                </>
              )}
              {profile?.role === 'admin' && (
                <Link to="/admin" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
              {(profile?.role === 'agent' || profile?.role === 'admin') && (
                <Link to="/agent-portal" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Agent Portal</span>
                </Link>
              )}
              {profile?.role === 'customer_support' && (
                <Link to="/support-portal" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                  <HeadphonesIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Support Portal</span>
                </Link>
              )}

              <Link to="/account-settings" onClick={() => setProfilePanelOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Account Settings</span>
              </Link>

              <div className="border-t border-border my-3" />

              <button onClick={() => { setProfilePanelOpen(false); handleSignOut(); }} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground hover:text-muted-foreground/60 transition-colors w-full text-left">
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