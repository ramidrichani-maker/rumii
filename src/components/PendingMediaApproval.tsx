import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Image as ImageIcon, Video } from "lucide-react";

interface PendingMedia {
  id: string;
  property_id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  status: string;
  created_at: string;
  properties: {
    address: string;
    city: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function PendingMediaApproval() {
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingMedia();
  }, []);

  const fetchPendingMedia = async () => {
    try {
      const { data: mediaData, error } = await supabase
        .from("property_media_pending")
        .select(`
          *,
          properties (address, city)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = mediaData?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Merge data
      const enrichedData = mediaData?.map(media => ({
        ...media,
        profiles: profiles?.find(p => p.user_id === media.user_id) || { full_name: 'Unknown' }
      }));

      setPendingMedia(enrichedData || []);
    } catch (error) {
      console.error("Error fetching pending media:", error);
      toast.error("Failed to load pending media");
    } finally {
      setLoading(false);
    }
  };

  const approveMedia = async (mediaId: string) => {
    try {
      const { error } = await supabase.rpc('approve_property_media', {
        media_id: mediaId
      });

      if (error) throw error;

      toast.success("Media approved and added to property");
      fetchPendingMedia();
    } catch (error) {
      console.error("Error approving media:", error);
      toast.error("Failed to approve media");
    }
  };

  const rejectMedia = async (mediaId: string) => {
    try {
      const { error } = await supabase
        .from("property_media_pending")
        .update({ status: "rejected" })
        .eq("id", mediaId);

      if (error) throw error;

      toast.success("Media rejected");
      fetchPendingMedia();
    } catch (error) {
      console.error("Error rejecting media:", error);
      toast.error("Failed to reject media");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading pending media...</p>;
  }

  if (pendingMedia.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No pending media approvals</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {pendingMedia.map((media) => (
        <Card key={media.id} className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-48 h-48 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {media.media_type === 'image' ? (
                <img
                  src={media.media_url}
                  alt="Pending media"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={media.media_url}
                  className="w-full h-full object-cover"
                  controls
                />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {media.properties.address}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {media.properties.city}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {media.media_type === 'image' ? (
                        <><ImageIcon className="w-3 h-3 mr-1" /> Image</>
                      ) : (
                        <><Video className="w-3 h-3 mr-1" /> Video</>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">
                  Uploaded by: <span className="font-medium">{media.profiles.full_name}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Submitted: {new Date(media.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => approveMedia(media.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectMedia(media.id)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
