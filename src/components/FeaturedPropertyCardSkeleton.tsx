/**
 * Loading state for a featured card: one solid medium-grey block that mirrors the
 * real card's shape, so the swap to the loaded card (which starts under the same
 * grey curtain) never flashes a different colour.
 */
const FeaturedPropertyCardSkeleton = () => {
  return (
    <div className="rumi-curtain-surface h-full w-full min-h-[18rem] md:min-h-[21rem] rounded-2xl overflow-hidden" />
  );
};

export default FeaturedPropertyCardSkeleton;
