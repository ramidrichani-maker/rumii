import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, Check, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeneratedImage {
  id: string;
  property_id: string;
  storage_path: string;
  media_url: string | null;
  style: string | null;
  palette: string | null;
  room_type: string | null;
  approved: boolean;
  created_at: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  images: string[] | null;
  unfurnished: boolean;
}

const STYLES = [
  { value: "modern", label: "Modern" },
  { value: "scandinavian", label: "Scandinavian" },
  { value: "industrial", label: "Industrial" },
  { value: "bohemian", label: "Bohemian" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "luxury", label: "Luxury" },
  { value: "minimalist", label: "Minimalist" },
  { value: "traditional", label: "Traditional" },
];

const PALETTES = [
  { value: "neutral", label: "Neutral" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "earth", label: "Earth Tones" },
  { value: "monochrome", label: "Monochrome" },
  { value: "vibrant", label: "Vibrant" },
];

const ROOM_TYPES = [
  { value: "bedroom", label: "Bedroom" },
  { value: "living_room", label: "Living Room" },
  { value: "salon", label: "Salon" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "toilet", label: "Toilet" },
  { value: "terrace", label: "Terrace" },
  { value: "balcony", label: "Balcony" },
  { value: "glass_curtain_balcony", label: "Closed Glass Curtain Balcony" },
  { value: "garden", label: "Garden" },
];

export default function AdminAIRoomDesigner() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [style, setStyle] = useState("modern");
  const [palette, setPalette] = useState("neutral");
  const [roomType, setRoomType] = useState("living_room");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("Starting...");
  const [progressPercent, setProgressPercent] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load unfurnished properties only
  useEffect(() => {
    const loadProperties = async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city, images, unfurnished")
        .eq("status", "approved")
        .eq("unfurnished", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading properties:", error);
        return;
      }

      setProperties(data || []);
    };

    loadProperties();
  }, []);

  // Load generated images for selected property
  useEffect(() => {
    if (!selectedPropertyId) {
      setGeneratedImages([]);
      return;
    }

    const loadGeneratedImages = async () => {
      setIsLoadingImages(true);
      const { data, error } = await supabase
        .from("property_generated_images")
        .select("*")
        .eq("property_id", selectedPropertyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading generated images:", error);
      } else {
        setGeneratedImages(data || []);
      }
      setIsLoadingImages(false);
    };

    loadGeneratedImages();
  }, [selectedPropertyId, generatedImage]);

  // Update selected property when ID changes
  useEffect(() => {
    if (selectedPropertyId) {
      const prop = properties.find(p => p.id === selectedPropertyId);
      setSelectedProperty(prop || null);
      setSelectedImageUrl("");
    } else {
      setSelectedProperty(null);
    }
  }, [selectedPropertyId, properties]);

  // Get the next room type label with number if duplicate
  const getRoomTypeLabel = (roomTypeValue: string, existingImages: GeneratedImage[]) => {
    const sameTypeImages = existingImages.filter(img => img.room_type === roomTypeValue);
    const roomLabel = ROOM_TYPES.find(r => r.value === roomTypeValue)?.label || roomTypeValue;
    if (sameTypeImages.length > 0) {
      return `${roomLabel} ${sameTypeImages.length + 1}`;
    }
    return roomLabel;
  };

  // Format room type display with number
  const formatRoomTypeDisplay = (roomTypeValue: string | null, imageId: string) => {
    if (!roomTypeValue) return "Unknown";
    const roomLabel = ROOM_TYPES.find(r => r.value === roomTypeValue)?.label || roomTypeValue;
    
    // Count how many images of this type come before this one
    const sameTypeImages = generatedImages.filter(img => img.room_type === roomTypeValue);
    if (sameTypeImages.length > 1) {
      const index = sameTypeImages.findIndex(img => img.id === imageId) + 1;
      return `${roomLabel} ${index}`;
    }
    return roomLabel;
  };

  // Count approved designs by style/palette combination
  const getApprovedCombinations = () => {
    const approved = generatedImages.filter(img => img.approved);
    const combinations: Record<string, number> = {};
    approved.forEach(img => {
      const key = `${img.style}/${img.palette}`;
      combinations[key] = (combinations[key] || 0) + 1;
    });
    return combinations;
  };

  const handleGenerate = async () => {
    if (!selectedImageUrl || !selectedPropertyId) {
      toast.error("Please select a property and image first");
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedImage(null);
      setProgress("Initializing AI...");
      setProgressPercent(0);

      // Clear any existing interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to use AI design features");
        setIsGenerating(false);
        return;
      }

      // Progress steps with timing
      const progressSteps = [
        { text: "Initializing AI...", percent: 5 },
        { text: "Analyzing room layout...", percent: 15 },
        { text: "Understanding room dimensions...", percent: 25 },
        { text: "Applying design style...", percent: 40 },
        { text: "Generating furniture placement...", percent: 55 },
        { text: "Adding decor and accessories...", percent: 70 },
        { text: "Enhancing lighting and shadows...", percent: 82 },
        { text: "Finalizing high-resolution image...", percent: 92 },
      ];

      let stepIndex = 0;
      progressIntervalRef.current = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          setProgress(progressSteps[stepIndex].text);
          setProgressPercent(progressSteps[stepIndex].percent);
          stepIndex++;
        }
      }, 2000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-room-design`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            imageUrl: selectedImageUrl,
            propertyId: selectedPropertyId,
            style,
            palette,
            roomType,
          }),
        }
      );

      // Clear the progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.status === "succeeded" && data.output) {
        const output = Array.isArray(data.output) ? data.output[0] : data.output;
        setProgressPercent(100);
        setProgress("Complete!");
        setGeneratedImage(output);
        setIsGenerating(false);
        toast.success(`Room design generated for ${ROOM_TYPES.find(r => r.value === roomType)?.label}!`);
        
        // Refresh the generated images list
        const { data: newImages } = await supabase
          .from("property_generated_images")
          .select("*")
          .eq("property_id", selectedPropertyId)
          .order("created_at", { ascending: false });
        if (newImages) setGeneratedImages(newImages);
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (error) {
      // Clear the progress interval on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      console.error("Error generating design:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate design");
      setIsGenerating(false);
      setProgress("Failed");
      setProgressPercent(0);
    }
  };

  const handleApproveImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("property_generated_images")
        .update({ approved: true })
        .eq("id", imageId);

      if (error) throw error;

      toast.success("Design approved! It will now be shown to customers.");
      setGeneratedImages(prev => 
        prev.map(img => img.id === imageId ? { ...img, approved: true } : img)
      );
    } catch (error) {
      console.error("Error approving image:", error);
      toast.error("Failed to approve design");
    }
  };

  const handleRejectImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("property_generated_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;

      toast.success("Design removed.");
      setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove design");
    }
  };

  const handleUnapproveImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("property_generated_images")
        .update({ approved: false })
        .eq("id", imageId);

      if (error) throw error;

      toast.success("Design unapproved.");
      setGeneratedImages(prev => 
        prev.map(img => img.id === imageId ? { ...img, approved: false } : img)
      );
    } catch (error) {
      console.error("Error unapproving image:", error);
      toast.error("Failed to unapprove design");
    }
  };

  const approvedCombinations = getApprovedCombinations();

  return (
    <div className="space-y-6">
      {/* Property Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Room Designer for Unfurnished Properties
          </CardTitle>
          <CardDescription>
            Generate AI-furnished room designs for unfurnished properties. Select the room type for each image.
            Approved designs will be shown to customers who can choose from up to 3 style/palette combinations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Property Selector */}
          <div className="space-y-2">
            <Label>Select Unfurnished Property</Label>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an unfurnished property..." />
              </SelectTrigger>
              <SelectContent>
                {properties.length === 0 ? (
                  <div className="p-2 text-center text-muted-foreground text-sm">
                    No unfurnished properties found
                  </div>
                ) : (
                  properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address}, {property.city}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Show approved combinations summary */}
          {selectedPropertyId && Object.keys(approvedCombinations).length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Approved Style/Palette Combinations:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(approvedCombinations).map(([combo, count]) => (
                  <Badge key={combo} variant="secondary">
                    {combo}: {count} room(s)
                  </Badge>
                ))}
              </div>
              {Object.keys(approvedCombinations).length >= 3 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✓ 3 combinations available for customers
                </p>
              )}
            </div>
          )}

          {/* Image Selection */}
          {selectedProperty && selectedProperty.images && selectedProperty.images.length > 0 && (
            <div className="space-y-2">
              <Label>Select Room Image</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {selectedProperty.images
                  .filter(img => !img.match(/\.(mp4|webm|ogg|mov|avi|wmv)$/i))
                  .map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageUrl(image)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImageUrl === image 
                          ? "border-primary ring-2 ring-primary/30" 
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <img src={image} alt={`Room ${index + 1}`} className="w-full h-full object-cover" />
                      {selectedImageUrl === image && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-6 w-6 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Room Type, Style and Palette Selection */}
          {selectedImageUrl && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Room Type *</Label>
                  <Select value={roomType} onValueChange={setRoomType} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Design Style</Label>
                  <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color Palette</Label>
                  <Select value={palette} onValueChange={setPalette} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PALETTES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview and Generate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Original Image</Label>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={selectedImageUrl}
                      alt="Original room"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Generated Design ({ROOM_TYPES.find(r => r.value === roomType)?.label})</Label>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {generatedImage ? (
                      <img
                        src={generatedImage}
                        alt="AI Generated design"
                        className="w-full h-full object-cover"
                      />
                    ) : isGenerating ? (
                      <div className="text-center px-6 w-full">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-3" />
                        <p className="text-sm font-medium text-foreground mb-2">{progress}</p>
                        <Progress value={progressPercent} className="h-2 mb-1" />
                        <p className="text-xs text-muted-foreground">{progressPercent}% complete</p>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto" />
                        <p className="text-sm mt-2">Click generate to create design</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedImageUrl}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {progress}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate {ROOM_TYPES.find(r => r.value === roomType)?.label} Design
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Generated Images List */}
      {selectedPropertyId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Generated Designs for This Property
            </CardTitle>
            <CardDescription>
              Approve designs to make them visible to customers. Create at least 3 different style/palette combinations for variety.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingImages ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : generatedImages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No AI designs generated yet for this property.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedImages.map((img) => (
                  <div key={img.id} className="border rounded-lg overflow-hidden">
                    <div className="relative aspect-video">
                      <img
                        src={img.media_url || ""}
                        alt="Generated design"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                        <Badge variant={img.approved ? "default" : "secondary"}>
                          {img.approved ? "Approved" : "Pending"}
                        </Badge>
                        {img.room_type && (
                          <Badge variant="outline" className="bg-background/80">
                            {formatRoomTypeDisplay(img.room_type, img.id)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{img.style || "modern"}</Badge>
                        <Badge variant="outline">{img.palette || "neutral"}</Badge>
                      </div>
                      <div className="flex gap-2">
                        {img.approved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnapproveImage(img.id)}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Unapprove
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleApproveImage(img.id)}
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectImage(img.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
