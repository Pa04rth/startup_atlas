import { getPool } from "../index";

// Fixed by design (per spec) — not configurable per offer, so every
// candidate sees the same ₹100 / ₹80 / ₹20 split everywhere the referral
// flow is shown, and the API never trusts a client-supplied amount.
export const REFERRAL_FEE_INR = 100;
export const REFERRAL_REFERRER_CUT_INR = 80;
export const REFERRAL_PLATFORM_CUT_INR = 20;

export type ReferralOfferStatus = "pending" | "approved" | "rejected";
export type ReferralOffer = {
  id: number;
  brandId: string;
  jobPostingId: number | null;
  jobTitle: string;
  referrerName: string;
  referrerEmail: string;
  referrerRole: string | null;
  referrerLinkedin: string | null;
  proofUrl: string;
  proofNote: string | null;
  pitch: string | null;
  status: ReferralOfferStatus;
  adminNotes: string | null;
  createdAt: string;
};

function mapOffer(r: Record<string, unknown>): ReferralOffer {
  return {
    id: r.id as number,
    brandId: r.brand_id as string,
    jobPostingId: r.job_posting_id as number | null,
    jobTitle: r.job_title as string,
    referrerName: r.referrer_name as string,
    referrerEmail: r.referrer_email as string,
    referrerRole: r.referrer_role as string | null,
    referrerLinkedin: r.referrer_linkedin as string | null,
    proofUrl: r.proof_url as string,
    proofNote: r.proof_note as string | null,
    pitch: r.pitch as string | null,
    status: r.status as ReferralOfferStatus,
    adminNotes: r.admin_notes as string | null,
    createdAt: r.created_at as string,
  };
}

export async function createReferralOffer(input: {
  brandId: string;
  jobPostingId?: number | null;
  jobTitle: string;
  referrerName: string;
  referrerEmail: string;
  referrerRole?: string | null;
  referrerLinkedin?: string | null;
  proofUrl: string;
  proofNote?: string | null;
  pitch?: string | null;
}): Promise<{ id: number }> {
  const pool = getPool();
  const { rows } = await pool.query(
    `insert into referral_offers
       (brand_id, job_posting_id, job_title, referrer_name, referrer_email, referrer_role,
        referrer_linkedin, proof_url, proof_note, pitch)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning id`,
    [
      input.brandId,
      input.jobPostingId ?? null,
      input.jobTitle,
      input.referrerName,
      input.referrerEmail,
      input.referrerRole ?? null,
      input.referrerLinkedin ?? null,
      input.proofUrl,
      input.proofNote ?? null,
      input.pitch ?? null,
    ]
  );
  return { id: rows[0].id };
}

// Public read — approved offers for a company's profile page. Never
// exposes referrer_email or proof_url publicly (that's admin-only via
// getPendingReferralOffers / getReferralOfferById) — a candidate only
// learns who referred them after they've paid and the referrer follows up.
export type PublicReferralOffer = {
  id: number;
  jobTitle: string;
  referrerName: string;
  referrerRole: string | null;
  pitch: string | null;
};
export async function getApprovedReferralOffers(brandId: string): Promise<PublicReferralOffer[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, job_title, referrer_name, referrer_role, pitch
     from referral_offers
     where brand_id = $1 and status = 'approved'
     order by created_at desc`,
    [brandId]
  );
  return rows.map((r) => ({
    id: r.id,
    jobTitle: r.job_title,
    referrerName: r.referrer_name,
    referrerRole: r.referrer_role,
    pitch: r.pitch,
  }));
}

export async function getPendingReferralOffers(): Promise<ReferralOffer[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, brand_id, job_posting_id, job_title, referrer_name, referrer_email, referrer_role,
            referrer_linkedin, proof_url, proof_note, pitch, status, admin_notes, created_at
     from referral_offers
     where status = 'pending'
     order by created_at asc`
  );
  return rows.map(mapOffer);
}

export async function getReferralOfferById(id: number): Promise<ReferralOffer | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, brand_id, job_posting_id, job_title, referrer_name, referrer_email, referrer_role,
            referrer_linkedin, proof_url, proof_note, pitch, status, admin_notes, created_at
     from referral_offers where id = $1`,
    [id]
  );
  return rows.length ? mapOffer(rows[0]) : null;
}

export async function setReferralOfferStatus(
  id: number,
  status: "approved" | "rejected",
  adminNotes?: string | null
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `update referral_offers set status = $2, admin_notes = $3, reviewed_at = now() where id = $1`,
    [id, status, adminNotes ?? null]
  );
}

export type ReferralRequestStatus = "requested" | "paid" | "fulfilled" | "released" | "refunded" | "rejected";
export type ReferralRequest = {
  id: number;
  offerId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  resumeUrl: string | null;
  status: ReferralRequestStatus;
  feeInr: number;
  referrerCutInr: number;
  platformCutInr: number;
  adminNotes: string | null;
  createdAt: string;
  // Joined in for the admin view — who to actually pay/contact.
  offerJobTitle?: string;
  offerReferrerName?: string;
  offerReferrerEmail?: string;
  brandName?: string;
};

function mapRequest(r: Record<string, unknown>): ReferralRequest {
  return {
    id: r.id as number,
    offerId: r.offer_id as number,
    candidateName: r.candidate_name as string,
    candidateEmail: r.candidate_email as string,
    candidatePhone: r.candidate_phone as string | null,
    resumeUrl: r.resume_url as string | null,
    status: r.status as ReferralRequestStatus,
    feeInr: r.fee_inr as number,
    referrerCutInr: r.referrer_cut_inr as number,
    platformCutInr: r.platform_cut_inr as number,
    adminNotes: r.admin_notes as string | null,
    createdAt: r.created_at as string,
    offerJobTitle: r.offer_job_title as string | undefined,
    offerReferrerName: r.offer_referrer_name as string | undefined,
    offerReferrerEmail: r.offer_referrer_email as string | undefined,
    brandName: r.brand_name as string | undefined,
  };
}

export async function createReferralRequest(input: {
  offerId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string | null;
  resumeUrl?: string | null;
}): Promise<{ id: number }> {
  const pool = getPool();
  const { rows } = await pool.query(
    `insert into referral_requests
       (offer_id, candidate_name, candidate_email, candidate_phone, resume_url, fee_inr, referrer_cut_inr, platform_cut_inr)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning id`,
    [
      input.offerId,
      input.candidateName,
      input.candidateEmail,
      input.candidatePhone ?? null,
      input.resumeUrl ?? null,
      REFERRAL_FEE_INR,
      REFERRAL_REFERRER_CUT_INR,
      REFERRAL_PLATFORM_CUT_INR,
    ]
  );
  return { id: rows[0].id };
}

// Server-side amount lookup for payment-verification — never trust a
// client-supplied amount for anything payment-adjacent, same rule as
// AD_PRICING for ad bookings.
export async function getReferralRequestAmount(id: number): Promise<number | null> {
  const pool = getPool();
  const { rows } = await pool.query(`select fee_inr from referral_requests where id = $1`, [id]);
  return rows.length ? (rows[0].fee_inr as number) : null;
}

export async function getReferralRequestsForAdmin(): Promise<ReferralRequest[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select rr.id, rr.offer_id, rr.candidate_name, rr.candidate_email, rr.candidate_phone, rr.resume_url,
            rr.status, rr.fee_inr, rr.referrer_cut_inr, rr.platform_cut_inr, rr.admin_notes, rr.created_at,
            ro.job_title as offer_job_title, ro.referrer_name as offer_referrer_name,
            ro.referrer_email as offer_referrer_email, b.name as brand_name
     from referral_requests rr
     join referral_offers ro on ro.id = rr.offer_id
     join brands b on b.id = ro.brand_id
     where rr.status != 'requested'
     order by rr.created_at desc
     limit 100`
  );
  return rows.map(mapRequest);
}

export async function setReferralRequestStatus(
  id: number,
  status: ReferralRequestStatus,
  adminNotes?: string | null
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `update referral_requests set status = $2, admin_notes = coalesce($3, admin_notes) where id = $1`,
    [id, status, adminNotes ?? null]
  );
}
