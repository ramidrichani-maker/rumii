import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, RefreshCw, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIRoomDesignerProps {
  propertyId: string;
  imageUrl: string;
  onImageGenerated?: (url: string) => void;
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

export default function AIRoomDesigner({ propertyId, imageUrl, onImageGenerated }: AIRoomDesignerProps) {
  const [style, setStyle] = useState("modern");
  const [palette, setPalette] = useState("neutral");
  const [isGenerating, setIsGenerating] = useState(false);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("Starting...");

  // Poll for completion
  useEffect(() => {
    if (!predictionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(
          "https://kubhguqlihooofnyvdpq.supabase.co/functions/v1/generate-room-design",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: "status",
              predictionId,
              propertyId,
            }),
          }
        );

        const data = await response.json();
        console.log("Prediction status:", data);

        if (data.status === "succeeded") {
          clearInterval(pollInterval);
          const output = Array.isArray(data.output) ? data.output[0] : data.output;
          setGeneratedImage(output);
          setIsGenerating(false);
          setPredictionId(null);
          setProgress("Complete!");
          toast.success("Room design generated successfully!");
          onImageGenerated?.(output);
        } else if (data.status === "failed") {
          clearInterval(pollInterval);
          setIsGenerating(false);
          setPredictionId(null);
          toast.error("Generation failed. Please try again.");
        } else if (data.status === "processing") {
          setProgress("Processing...");
        } else if (data.status === "starting") {
          setProgress("Starting model...");
        }
      } catch (error) {
        console.error("Error polling status:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [predictionId, propertyId, onImageGenerated]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setGeneratedImage(null);
      setProgress("Generating design...");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to use AI design features");
        setIsGenerating(false);
        return;
      }

      const response = await fetch(
        "https://kubhguqlihooofnyvdpq.supabase.co/functions/v1/generate-room-design",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            imageUrl,
            propertyId,
            style,
            palette,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Handle synchronous response (replicate.run waits for completion)
      if (data.status === "succeeded" && data.output) {
        const output = Array.isArray(data.output) ? data.output[0] : data.output;
        setGeneratedImage(output);
        setIsGenerating(false);
        toast.success("Room design generated successfully!");
        onImageGenerated?.(output);
      } else if (data.predictionId) {
        // Fallback for async polling if needed
        setPredictionId(data.predictionId);
        toast.info("Generation started! This may take 30-60 seconds.");
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (error) {
      console.error("Error generating design:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate design");
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Room Staging
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Original Image Preview */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt="Original room"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-xs font-medium">
            Original
          </div>
        </div>

        {/* Style Selection */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
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
              Generate Furnished Design
            </>
          )}
        </Button>

        {/* Generated Image */}
        {generatedImage && (
          <div className="space-y-2">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={generatedImage}
                alt="AI Generated design"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                AI Generated
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button
                size="sm"
                onClick={() => onImageGenerated?.(generatedImage)}
                className="flex-1"
              >
                <Check className="mr-2 h-4 w-4" />
                Use This Design
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
