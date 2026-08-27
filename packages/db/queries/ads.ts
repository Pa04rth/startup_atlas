import { getPool } from "../index";

export type AdKind = "banner" | "boost" | "flash" | "featured";

export type LiveAd = {
  id: number;
  brandId: string | null;
  kind: AdKind;
  startsAt: string | null;
  endsAt: string | null;
  brandName: string | null;
  brandSlug: string | null;
  brandLogoUrl: string | null;
};

export async function getLiveAds(cityId: string, kind?: AdKind): Promise<LiveAd[]> {
  const pool = getPool();
  const params: unknown[] = [cityId];
  let kindClause = "";
  if (kind) {
    params.push(kind);
    kindClause = `and ab.kind = $${params.length}`;
  }

  const { rows } = await pool.query(
    `select ab.id, ab.brand_id, ab.kind, ab.starts_at, ab.ends_at,
            b.name as brand_name, b.slug as brand_slug, b.logo_url as brand_logo_url
     from ad_bookings ab
     left join brands b on b.id = ab.brand_id
     where ab.city_id = $1 and ab.status = 'live'
       and (ab.starts_at is null or ab.starts_at <= now())
       and (ab.ends_at is null or ab.ends_at >= now())
       ${kindClause}
     order by ab.created_at desc`,
    params
  );
  return rows.map((r) => ({
    id: r.id,
    brandId: r.brand_id,
    kind: r.kind,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    brandName: r.brand_name,
    brandSlug: r.brand_slug,
    brandLogoUrl: r.brand_logo_url,
  }));
}

// Looks up the real amount for a booking server-side — never trust a client-
// supplied amount when creating a payment_verifications row (see
// api/payment-verification/route.ts).
export async function getAdBookingAmount(id: number): Promise<number | null> {
  const pool = getPool();
  const { rows } = await pool.query(`select amount_inr from ad_bookings where id = $1`, [id]);
  return rows[0]?.amount_inr ?? null;
}

export async function createAdBooking(input: {
  cityId: string;
  brandId?: string | null;
  kind: AdKind;
  amountInr: number;
  contactEmail: string;
}): Promise<{ id: number }> {
  const pool = getPool();
  const { rows } = await pool.query(
    `insert into ad_bookings (city_id, brand_id, kind, amount_inr, contact_email, status)
     values ($1,$2,$3,$4,$5,'waitlisted')
     returning id`,
    [input.cityId, input.brandId ?? null, input.kind, input.amountInr, input.contactEmail]
  );
  return { id: rows[0].id };
}
