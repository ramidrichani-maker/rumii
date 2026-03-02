import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Home, User, LogOut, Settings, BarChart3, Shield, Heart, Camera, PlusCircle, Bookmark, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
export const Navbar = () => {
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
  return <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2">
              <Home className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold">Oracle Estates</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-1">
              <Link to="/purchase">
                <Button variant="ghost" size="sm">Buy</Button>
              </Link>
              <Link to="/rent">
                <Button variant="ghost" size="sm">Rent</Button>
              </Link>
              <Link to="/find-agents">
                <Button variant="ghost" size="sm">Find agents</Button>
              </Link>
              <Link to="/new-homes">
                <Button variant="ghost" size="sm">New homes</Button>
              </Link>
              <Link to="/agent-valuation">
                <Button variant="ghost" size="sm">Agent valuation</Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/favorites" className="hidden md:flex items-center space-x-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Bookmark className="w-4 h-4" />
              <span>Saved</span>
            </Link>
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
                <NotificationBell />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile?.full_name || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={getRoleBadgeVariant(profile?.role || 'user')} className="text-xs">
                            {profile?.role || 'user'}
                          </Badge>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/request-photography" className="flex items-center">
                        <Camera className="mr-2 h-4 w-4" />
                        <span>Photography Service</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/investment-analytics" className="flex items-center">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Investment Analytics</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-listings" className="flex items-center">
                        <Home className="mr-2 h-4 w-4" />
                        <span>My Listings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/list-property" className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>List Property</span>
                      </Link>
                    </DropdownMenuItem>
                    {profile?.role === 'user' && <DropdownMenuItem asChild>
                        <Link to="/my-viewings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>My Viewings</span>
                        </Link>
                      </DropdownMenuItem>}
                    {profile?.role === 'admin' && <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center">
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>}
                    {(profile?.role === 'agent' || profile?.role === 'admin') && <DropdownMenuItem asChild>
                        <Link to="/agent-portal" className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <span>Agent Portal</span>
                        </Link>
                      </DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </> : <Link to="/auth">
                <Button>Sign In</Button>
              </Link>}
          </div>
        </div>
      </div>
    </nav>;
};