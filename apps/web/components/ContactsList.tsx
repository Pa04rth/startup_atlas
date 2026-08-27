import type { CompanyContact } from "@startup-atlas/db";

const TYPE_LABELS: Record<CompanyContact["type"], string> = {
  hr: "HR",
  careers: "Careers",
  leadership: "Leadership",
  general: "General",
};

export function ContactsList({ contacts }: { contacts: CompanyContact[] }) {
  if (contacts.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-neutral-900">Contacts</h2>
      <ul className="mt-2 space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium text-neutral-700">{TYPE_LABELS[c.type]}:</span>
            {c.email && (
              <a href={`mailto:${c.email}`} className="text-emerald-700 hover:underline">
                {c.email}
              </a>
            )}
            {c.url && (
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                {c.url}
              </a>
            )}
            <a
              href={c.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              (source)
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-neutral-400">
        Public business contacts only, sourced with a link above.{" "}
        <a href="mailto:parthsohaney04@gmail.com?subject=Opt-out request" className="underline hover:text-neutral-600">
          Report or request removal
        </a>
        .
      </p>
    </section>
  );
}
