import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const FeaturedPropertyCardSkeleton = () => {
  return (
    <Card className="h-full overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none rounded-t-lg" />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="pt-0">
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