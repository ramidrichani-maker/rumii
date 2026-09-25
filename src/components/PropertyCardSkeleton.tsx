import React from "react";

/**
 * Loading state for a listing card: one solid medium-grey block that mirrors the
 * real card's shape, so the swap to the loaded card (which starts under the same
 * grey curtain) never flashes a different colour.
 */
const PropertyCardSkeleton: React.FC = () => {
  return (
    <div className="rumi-curtain-surface w-full h-full min-h-[15rem] md:min-h-[26rem] rounded-2xl overflow-hidden" />
  );
};

export default PropertyCardSkeleton;
