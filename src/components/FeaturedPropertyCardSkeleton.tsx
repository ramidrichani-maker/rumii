import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const FeaturedPropertyCardSkeleton = () => {
  return (
    <Card className="h-full overflow-hidden">
      {/* Image area — matches the real card's h-48 header image */}
      <Skeleton className="h-48 w-full rounded-none rounded-t-lg" />

      <CardHeader className="pb-1 pt-3">
        {/* Price — right-aligned, mirrors the text-2xl price row */}
        <div className="flex justify-end items-start mb-1">
          <Skeleton className="h-7 w-28" />
        </div>
        {/* City title */}
        <Skeleton className="h-5 w-2/3" />
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        {/* Bed / bath / m² spec row */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
        </div>
      </CardContent>
    </Card>
  );
};

export default FeaturedPropertyCardSkeleton;
