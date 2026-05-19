import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PropertyCardSkeleton: React.FC = () => {
  return (
    <Card className="flex flex-row overflow-hidden">
      {/* Image skeleton */}
      <div className="w-32 min-w-[8rem] md:w-96 md:min-w-[24rem] h-auto min-h-[10rem] md:min-h-[14rem] flex-shrink-0 bg-muted">
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      {/* Details skeleton */}
      <div className="flex flex-col flex-1 p-2 md:p-4 min-w-0 gap-2">
        {/* Price */}
        <Skeleton className="h-5 md:h-8 w-32 md:w-48" />

        {/* Beds/Baths/Size row */}
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <Skeleton className="h-3 md:h-4 w-14" />
          <Skeleton className="h-3 md:h-4 w-14" />
          <Skeleton className="h-3 md:h-4 w-14" />
        </div>

        {/* Location */}
        <Skeleton className="h-3 md:h-4 w-40 md:w-64" />

        {/* Description */}
        <div className="hidden md:flex flex-col gap-1 mt-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-1 md:gap-2 justify-end flex-wrap">
          <Skeleton className="h-7 md:h-9 w-20 md:w-28 rounded-md" />
          <Skeleton className="h-7 md:h-9 w-14 md:w-20 rounded-md" />
          <Skeleton className="h-7 md:h-9 w-14 md:w-20 rounded-md" />
        </div>
      </div>
    </Card>
  );
};

export default PropertyCardSkeleton;
