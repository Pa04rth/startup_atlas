import { NextResponse } from "next/server";
import { getCitySnapshot } from "@/lib/snapshot";

export const revalidate = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const snapshot = await getCitySnapshot(city);
  if (!snapshot) {
    return NextResponse.json({ error: "unknown city" }, { status: 404 });
  }
  return NextResponse.json(snapshot);
}
