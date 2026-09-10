import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PropertyCardSkeleton: React.FC = () => {
  return (
    <Card className="border-0 rounded-2xl overflow-hidden bg-muted flex flex-col w-full h-full">
      {/* Image skeleton: full-width banner on all sizes */}
      <div className="w-full h-40 md:h-[22rem] flex-shrink-0 bg-muted">
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      {/* Details skeleton: centered rows like the real card */}
      <div className="flex flex-col flex-1 p-2 md:p-4 min-w-0 gap-2 items-center text-center">
        {/* Area / city */}
        <Skeleton className="h-4 md:h-5 w-24 md:w-40" />

        {/* Price */}
        <Skeleton className="h-5 md:h-7 w-28 md:w-48" />

        {/* Beds/Baths/Size row */}
        <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
          <Skeleton className="h-3 md:h-4 w-10 md:w-14" />
          <Skeleton className="h-3 md:h-4 w-10 md:w-14" />
          <Skeleton className="h-3 md:h-4 w-10 md:w-14" />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1 mt-1 items-center w-full">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </Card>
  );
};

export default PropertyCardSkeleton;
