import { getPool } from "../index";

export type PaymentVerificationKind = "ad_booking" | "subscription" | "connect_request";
export type PaymentVerificationStatus = "pending" | "approved" | "rejected";

export type PaymentVerification = {
  id: number;
  kind: PaymentVerificationKind;
  referenceId: string;
  amountInr: number;
  payerName: string | null;
  payerContact: string;
  transactionId: string;
  screenshotUrl: string | null;
  status: PaymentVerificationStatus;
  notes: string | null;
  createdAt: string;
};

function mapRow(r: Record<string, unknown>): PaymentVerification {
  return {
    id: r.id as number,
    kind: r.kind as PaymentVerificationKind,
    referenceId: r.reference_id as string,
    amountInr: r.amount_inr as number,
    payerName: r.payer_name as string | null,
    payerContact: r.payer_contact as string,
    transactionId: r.transaction_id as string,
    screenshotUrl: r.screenshot_url as string | null,
    status: r.status as PaymentVerificationStatus,
    notes: r.notes as string | null,
    createdAt: r.created_at as string,
  };
}

export async function insertPaymentVerification(input: {
  kind: PaymentVerificationKind;
  referenceId: string;
  amountInr: number;
  payerName?: string | null;
  payerContact: string;
  transactionId: string;
  screenshotUrl?: string | null;
}): Promise<{ id: number }> {
  const pool = getPool();
  const { rows } = await pool.query(
    `insert into payment_verifications
       (kind, reference_id, amount_inr, payer_name, payer_contact, transaction_id, screenshot_url)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning id`,
    [
      input.kind,
      input.referenceId,
      input.amountInr,
      input.payerName ?? null,
      input.payerContact,
      input.transactionId,
      input.screenshotUrl ?? null,
    ]
  );
  return { id: rows[0].id };
}

export async function getPendingVerifications(): Promise<PaymentVerification[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, kind, reference_id, amount_inr, payer_name, payer_contact, transaction_id,
            screenshot_url, status, notes, created_at
     from payment_verifications
     where status = 'pending'
     order by created_at asc`
  );
  return rows.map(mapRow);
}

// Only 'ad_booking' has a handler today — subscriptions/connect_requests get
// their branch here once those phases are built (packages/db/migrations
// 0001/0002 create the tables they'd update).
export async function approveVerification(id: number): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `update payment_verifications set status='approved', reviewed_at=now()
       where id=$1 and status='pending'
       returning kind, reference_id`,
      [id]
    );
    if (rows.length === 0) {
      throw new Error(`payment_verifications ${id} not found or not pending`);
    }
    const kind = rows[0].kind as PaymentVerificationKind;
    const referenceId = rows[0].reference_id as string;

    if (kind === "ad_booking") {
      await client.query(`update ad_bookings set status='live' where id=$1`, [referenceId]);
    } else {
      throw new Error(`no handler yet for payment_verifications.kind = "${kind}"`);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function rejectVerification(id: number, notes: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `update payment_verifications set status='rejected', reviewed_at=now(), notes=$2
     where id=$1 and status='pending'`,
    [id, notes]
  );
}
