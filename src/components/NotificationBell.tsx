import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'viewings' | 'properties' | 'agents'>('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'error' ? 'destructive' : 'default'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.read).length || 0);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return;
    }

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await markAsRead(notification.id);
    
    // Close popover
    setIsOpen(false);

    // Try to resolve a related property and open its detail page directly.
    const propertyId = await resolveRelatedPropertyId(notification);
    if (propertyId) {
      navigate(`/property/${propertyId}`);
      return;
    }

    // Fallback: route by notification topic.
    const type = notification.type.toLowerCase();
    const haystack = `${notification.title} ${notification.message}`.toLowerCase();
    if (type.includes('viewing') || haystack.includes('viewing') || haystack.includes('appointment')) {
      navigate('/client-dashboard');
    } else if (haystack.includes('property') || haystack.includes('listing') || haystack.includes('media')) {
      navigate('/my-listings');
    } else if (haystack.includes('agent')) {
      navigate('/agent-portal');
    }
  };

  // Attempt to find the property referenced by a notification.
  // Strategy:
  //  1. Look for a "#<property_code>" in the title/message and match by property_code.
  //  2. Otherwise, try to extract an address after "at " from the message and
  //     match it against the current user's properties (case-insensitive).
  const resolveRelatedPropertyId = async (
    notification: Notification
  ): Promise<string | null> => {
    if (!user) return null;
    const text = `${notification.title} ${notification.message}`;

    try {
      // 1) Property code like "#1234"
      const codeMatch = text.match(/#(\d{1,10})\b/);
      if (codeMatch) {
        const code = parseInt(codeMatch[1], 10);
        const { data } = await supabase
          .from('properties')
          .select('id')
          .eq('property_code', code)
          .maybeSingle();
        if (data?.id) return data.id;
      }

      // 2) Address after "at " up to a period or "has".
      // Examples:
      //  "Your property listing at 123 Main St has been approved"
      //  "A viewing has been requested for 123 Main St on 2024-01-01..."
      const addressMatch =
        text.match(/\b(?:at|for)\s+(.+?)\s+(?:has|on|is|was|will)\b/i) ||
        text.match(/\b(?:at|for)\s+(.+?)[.!?]/i);
      const addressGuess = addressMatch?.[1]?.trim();
      if (addressGuess) {
        const { data } = await supabase
          .from('properties')
          .select('id, address')
          .ilike('address', addressGuess)
          .limit(1);
        if (data && data.length > 0) return data[0].id;
      }
    } catch (err) {
      console.error('Failed to resolve notification property:', err);
    }
    return null;
  };

  const getNotificationCategory = (notification: Notification): string => {
    const title = notification.title.toLowerCase();
    const message = notification.message.toLowerCase();
    
    if (title.includes('viewing') || message.includes('viewing') || title.includes('appointment')) {
      return 'viewings';
    } else if (title.includes('property') || message.includes('property') || title.includes('listing') || title.includes('media')) {
      return 'properties';
    } else if (title.includes('agent') || message.includes('agent')) {
      return 'agents';
    }
    return 'other';
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    return getNotificationCategory(notification) === filter;
  });

  const filteredUnreadCount = notifications.filter(n => {
    if (!n.read) {
      if (filter === 'all') return true;
      return getNotificationCategory(n) === filter;
    }
    return false;
  }).length;

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-3">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {filteredUnreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="viewings" className="text-xs">Viewings</TabsTrigger>
                <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
                <TabsTrigger value="agents" className="text-xs">Agents</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium truncate">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleDateString()} at{' '}
                            {new Date(notification.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};