import { getBrandsByStatus } from "@startup-atlas/db";
import ReviewQueueClient from "./ReviewQueueClient";

export default async function ReviewQueuePage() {
  const brands = await getBrandsByStatus("review");

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Review queue</h1>
      <p className="mt-1 text-sm text-neutral-500">{brands.length} brands waiting for a decision.</p>
      <ReviewQueueClient brands={brands} />
    </div>
  );
}
