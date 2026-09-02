// Shared styling for every public form (SubmitForm, AdvertiseForm,
// PaymentVerificationForm, ManageCompanyForm, ReferralOfferForm,
// ReferralRequestForm) — one place to keep them visually consistent
// instead of six copies of the same Tailwind strings drifting apart.
export const cardClass =
  "space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-8";

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.75 text-sm text-neutral-900 shadow-sm " +
  "transition placeholder:text-neutral-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10";

export const labelClass = "block text-sm font-medium text-neutral-800";

export const sectionTitleClass = "text-xs font-semibold uppercase tracking-wide text-neutral-400";

export const primaryButtonClass =
  "w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 " +
  "transition hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/25 active:scale-[0.99] " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm";

export const secondaryButtonClass =
  "rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-600 " +
  "transition hover:border-neutral-300 hover:bg-neutral-50";

export const errorClass = "rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700";

export const successCardClass =
  "rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-6 text-center shadow-sm";

export const fileInputClass =
  "mt-1.5 w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 " +
  "file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-neutral-700 file:transition hover:file:bg-neutral-200";
