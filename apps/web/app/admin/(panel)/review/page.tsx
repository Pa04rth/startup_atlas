import { getBrandsByStatus } from "@startup-atlas/db";
import ReviewQueueClient from "./ReviewQueueClient";
import { mutedText } from "../_theme";

export default async function ReviewQueuePage() {
  const brands = await getBrandsByStatus("review");

  return (
    <div>
      <h1 className="text-2xl font-normal font-[family-name:var(--font-heading)]">Review queue</h1>
      <p className={`mt-1 text-sm ${mutedText}`}>{brands.length} brands waiting for a decision.</p>
      <ReviewQueueClient brands={brands} />
    </div>
  );
}
