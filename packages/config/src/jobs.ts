// Same taxonomy services/pipeline/src/lib/job_classify.ts infers job_postings.track/
// seniority into — kept here (not imported from the pipeline package) so apps/web
// can use it for the hiring-mode Field/Level facet bar without pulling in a
// services/* dependency. Order here is display order for that bar.
export const JOB_TRACKS = [
  "Engineering",
  "Data & AI",
  "Product",
  "Design",
  "Sales & Marketing",
  "Operations",
  "Other",
] as const;

export const JOB_SENIORITIES = ["Fresher", "Junior", "Mid", "Senior", "Lead"] as const;
