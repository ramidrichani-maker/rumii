import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Star, Building2 } from "lucide-react";
import { format } from "date-fns";

interface FeatureRequest {
  id: string;
  property_id: string;
  agency_id: string;
  requested_by: string;
  status: string;
  admin_notes: string | null;
  requested_days?: number;
  created_at: string;
  updated_at: string;
  property?: {
    address: string;
    city: string;
    price: number;
    listing_type: string;
  };
  agency?: {
    name: string;
  };
  requester?: {
    full_name: string;
  };
}

const FeatureRequestsManager = () => {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data
      const requestsWithDetails = await Promise.all(
        (data || []).map(async (request) => {
          const { data: property } = await supabase
            .from('properties')
            .select('address, city, price, listing_type')
            .eq('id', request.property_id)
            .single();

          const { data: agency } = await supabase
            .from('agencies')
            .select('name')
            .eq('id', request.agency_id)
            .single();

          const { data: requester } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', request.requested_by)
            .single();

          return {
            ...request,
            property,
            agency,
            requester
          };
        })
      );

      setRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error loading feature requests:', error);
      toast({
        title: "Error",
        description: "Failed to load feature requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string, propertyId: string, listingType?: string) => {
    try {
      // Update the request status
      const { error: requestError } = await supabase
        .from('featured_requests')
        .update({ 
          status: 'approved',
          admin_notes: adminNotes[requestId] || null
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // Set the property as featured in the correct section based on listing type
      const section = listingType === 'sale' ? 'properties_for_sale' : 'featured_rentals';
      const { error: propertyError } = await supabase
        .from('properties')
        .update({ featured_section: section })
        .eq('id', propertyId);

      if (propertyError) throw propertyError;

      toast({
        title: "Success",
        description: "Feature request approved and property is now featured",
      });

      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve feature request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('featured_requests')
        .update({ 
          status: 'rejected',
          admin_notes: adminNotes[requestId] || null
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feature request rejected",
      });

      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject feature request",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (requestId: string, propertyId: string, status: string) => {
    try {
      if (status === 'approved') {
        const { error: propertyError } = await supabase
          .from('properties')
          .update({ featured_section: null })
          .eq('id', propertyId);

        if (propertyError) throw propertyError;
      }

      const { error } = await supabase
        .from('featured_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: status === 'approved' ? "Feature removed from listing" : "Feature request deleted",
      });

      loadRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete feature request",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (isLoading) {
    return <div className="text-center py-8">Loading feature requests...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Pending Feature Requests
          </CardTitle>
          <CardDescription>
            Review and approve agency requests to feature their properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pending feature requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{request.agency?.name || 'Unknown Agency'}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <h3 className="font-semibold">{request.property?.address}</h3>
                      <p className="text-sm text-muted-foreground">
                        {request.property?.city} • ${request.property?.price?.toLocaleString()} • {request.property?.listing_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested by: {request.requester?.full_name || 'Unknown'} • {format(new Date(request.created_at), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs font-medium">
                        Requested duration: {request.requested_days ?? 7} days
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Admin notes (optional)"
                      value={adminNotes[request.id] || ''}
                      onChange={(e) => setAdminNotes({ ...adminNotes, [request.id]: e.target.value })}
                      className="text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id, request.property_id, request.property?.listing_type)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests History */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{request.property?.address}</span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {request.agency?.name} • {format(new Date(request.updated_at), 'MMM dd, yyyy')}
                    </p>
                    {request.admin_notes && (
                      <p className="text-xs text-muted-foreground italic">Notes: {request.admin_notes}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(request.id, request.property_id, request.status)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeatureRequestsManager;
