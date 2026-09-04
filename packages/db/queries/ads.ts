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

export type AdStatus = "waitlisted" | "queued" | "live" | "expired" | "rejected";

export type AdBookingRow = {
  id: number;
  cityId: string;
  kind: AdKind;
  amountInr: number;
  status: AdStatus;
  contactEmail: string | null;
  paymentRef: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  brandId: string | null;
  brandName: string | null;
  hasVerification: boolean;
};

// Everything the advertise form has ever created, newest first — the admin
// ads queue (apps/web/app/admin/(panel)/ads). Before this existed, a booking
// was only ever visible if the advertiser also uploaded a payment screenshot
// (approveVerification is what flips one to 'live'), so anyone who filled in
// the form and stopped there sat in 'waitlisted' unseen by anybody.
// hasVerification says whether money has actually been claimed yet, so the
// queue can show which rows the payments screen already covers.
export async function getAdBookings(status?: AdStatus): Promise<AdBookingRow[]> {
  const pool = getPool();
  const params: unknown[] = [];
  let statusClause = "";
  if (status) {
    params.push(status);
    statusClause = `where ab.status = $${params.length}`;
  }

  const { rows } = await pool.query(
    `select ab.id, ab.city_id, ab.kind, ab.amount_inr, ab.status, ab.contact_email,
            ab.payment_ref, ab.starts_at, ab.ends_at, ab.created_at,
            ab.brand_id, b.name as brand_name,
            exists (
              select 1 from payment_verifications pv
              where pv.kind = 'ad_booking' and pv.reference_id::text = ab.id::text
            ) as has_verification
     from ad_bookings ab
     left join brands b on b.id = ab.brand_id
     ${statusClause}
     order by ab.created_at desc`,
    params
  );
  return rows.map((r) => ({
    id: Number(r.id),
    cityId: r.city_id,
    kind: r.kind,
    amountInr: r.amount_inr,
    status: r.status,
    contactEmail: r.contact_email,
    paymentRef: r.payment_ref,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at,
    brandId: r.brand_id,
    brandName: r.brand_name,
    hasVerification: r.has_verification,
  }));
}

export async function getAdBookingCounts(): Promise<Record<string, number>> {
  const pool = getPool();
  const { rows } = await pool.query(`select status, count(*)::int as count from ad_bookings group by status`);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status as string] = r.count as number;
  return out;
}

// Going live sets the run window if it isn't already set: starts now, ends
// `days` later. Any other transition leaves the dates alone — an expired or
// rejected booking keeps the window it actually ran for, rather than having
// its history rewritten by a status change.
export async function setAdBookingStatus(id: number, status: AdStatus, days = 7): Promise<void> {
  const pool = getPool();
  if (status === "live") {
    await pool.query(
      `update ad_bookings
         set status = 'live',
             starts_at = coalesce(starts_at, now()),
             ends_at = coalesce(ends_at, now() + ($2 || ' days')::interval)
       where id = $1`,
      [id, String(days)]
    );
    return;
  }
  await pool.query(`update ad_bookings set status = $2 where id = $1`, [id, status]);
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
