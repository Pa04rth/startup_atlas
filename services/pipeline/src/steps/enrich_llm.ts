// Fill in a description only where a source didn't already give us a real
// one — never overwrite a sourced fact with a model guess.
import { enrichDescription } from "../lib/llm";
import type { NormalizedRecord } from "../types";

export async function enrichLlm(records: NormalizedRecord[]): Promise<NormalizedRecord[]> {
  const out: NormalizedRecord[] = [];

  for (const record of records) {
    if (record.description) {
      out.push(record);
      continue;
    }
    const enrichment = await enrichDescription({ name: record.name, tagline: record.tagline });
    out.push(enrichment ? { ...record, description: enrichment.description } : record);
  }

  return out;
}
