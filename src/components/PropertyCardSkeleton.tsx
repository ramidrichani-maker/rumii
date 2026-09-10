import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PropertyCardSkeleton: React.FC = () => {
  return (
    <Card className="border-0 rounded-2xl overflow-hidden bg-muted flex flex-row md:flex-col w-full h-full min-h-[10rem] md:min-h-[32rem]">
      {/* Image skeleton: left column on mobile, full-width banner on desktop */}
      <div className="w-32 min-w-[8rem] h-auto min-h-[10rem] md:w-full md:min-w-0 md:h-[22rem] md:min-h-0 flex-shrink-0 bg-muted">
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      {/* Details skeleton: right side on mobile, centered rows on desktop */}
      <div className="flex flex-col flex-1 p-2 md:p-4 min-w-0 gap-2 md:items-center md:text-center">
        {/* Area / city */}
        <Skeleton className="h-4 md:h-5 w-28 md:w-40" />

        {/* Price */}
        <Skeleton className="h-5 md:h-7 w-32 md:w-48" />

        {/* Beds/Baths/Size row */}
        <div className="flex items-center gap-2 md:gap-4 flex-wrap md:justify-center">
          <Skeleton className="h-3 md:h-4 w-14" />
          <Skeleton className="h-3 md:h-4 w-14" />
          <Skeleton className="h-3 md:h-4 w-14" />
        </div>

        {/* Description */}
        <div className="hidden md:flex flex-col gap-1 mt-1 items-center w-full">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>

        <div className="flex-1 md:hidden" />

        {/* Action buttons (mobile only — desktop grid cards show none) */}
        <div className="flex md:hidden items-center gap-1 justify-end flex-wrap">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-14 rounded-md" />
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>
      </div>
    </Card>
  );
};

export default PropertyCardSkeleton;
