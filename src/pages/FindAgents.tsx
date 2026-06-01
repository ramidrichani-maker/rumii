import { useState } from 'react';
import { Send, MapPin, Briefcase, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const ORACLE_ESTATES_NAME = 'Oracle Estates';

const FindAgents = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [agentType, setAgentType] = useState('');
  const [sending, setSending] = useState(false);

  const handleConnect = async () => {
    if (!user) {
      toast({ title: 'Please sign in', description: 'You need to be signed in to connect with an agent.', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    if (!location) {
      toast({ title: 'Location required', description: 'Please enter a location to connect with an agent.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      // Find the Oracle Estates agency
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('id')
        .eq('name', ORACLE_ESTATES_NAME)
        .maybeSingle();

      if (agencyError || !agency) {
        toast({ title: 'Error', description: 'Could not find Oracle Estates agency. Please try again later.', variant: 'destructive' });
        setSending(false);
        return;
      }

      // Find all agents belonging to Oracle Estates
      const { data: agents, error: agentsError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('agency_id', agency.id)
        .in('role', ['agent', 'agency_manager', 'admin']);

      if (agentsError || !agents || agents.length === 0) {
        toast({ title: 'No agents available', description: 'No Oracle Estates agents are currently available. Please try again later.', variant: 'destructive' });
        setSending(false);
        return;
      }

      const agentTypeLabel = agentType === 'sales' ? 'Sales' : agentType === 'rent_out' ? 'Rent out' : agentType === 'commercial' ? 'Commercial' : 'Not specified';
      const clientName = profile?.full_name || 'A client';
      const clientPhone = profile?.phone_number || 'Not provided';

      const messageBody = `New client enquiry from the Find Agents page:\n\nClient: ${clientName}\nPhone: ${clientPhone}\nEmail: ${user.email || 'Not provided'}\n\nSearch Criteria:\n- Location: ${location}\n- Agent Type: ${agentTypeLabel}`;

      // Send a message to each Oracle Estates agent
      const messageInserts = agents.map(agent => ({
        sender_user_id: user.id,
        recipient_user_id: agent.user_id,
        subject: `New Agent Enquiry - ${location}`,
        body: messageBody,
      }));

      const { error: msgError } = await supabase
        .from('messages')
        .insert(messageInserts);

      if (msgError) {
        console.error('Message send error:', msgError);
        toast({ title: 'Error', description: 'Failed to send your request. Please try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Request sent!', description: `Your details have been sent to ${agents.length} Oracle Estates agent${agents.length > 1 ? 's' : ''}. They will be in touch soon.` });
        // Reset form
        setLocation('');
        setAgentType('');
      }
    } catch (err) {
      console.error('Connect error:', err);
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-10">
            Discover top local estate agents.
          </h1>

          {/* Search Form */}
          <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm space-y-5 text-left">
            {/* Location */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter a city, area, or governorate..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Agent Type */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Agent Type</Label>
              <Select value={agentType} onValueChange={setAgentType}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select agent type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="rent_out">Rent out</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Connect Button */}
            <Button onClick={handleConnect} className="w-full mt-2" size="lg" disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {sending ? 'Sending...' : 'Connect with Agent'}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FindAgents;
