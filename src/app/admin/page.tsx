import Link from "next/link";
import { Users, FileStack, HelpCircle, FolderOpen, ClipboardList } from "lucide-react";

const stats = [
  { label: "Students", value: "1,284", icon: Users },
  { label: "Mocks", value: "38", icon: FileStack },
  { label: "Questions", value: "421", icon: HelpCircle },
  { label: "Materials", value: "76", icon: FolderOpen },
  { label: "Attempts", value: "8,492", icon: ClipboardList },
];

const sections = [
  { title: "Daily Practice", desc: "Question of the Day, RC of the Day, DILR Set of the Day", href: "/admin/daily" },
  { title: "Sectional Mocks", desc: "VARC, DILR, QA sectionals — add, edit, publish", href: "/admin/mocks?type=sectional" },
  { title: "Full Mocks", desc: "Full CAT-pattern mocks — add, edit, publish", href: "/admin/mocks?type=full" },
  { title: "Materials", desc: "Upload notes and PDFs by section", href: "/admin/materials" },
  { title: "Questions", desc: "Manual editor or bulk CSV/Excel import", href: "/admin/questions" },
  { title: "Students", desc: "View student accounts and attempt history", href: "/admin/students" },
];

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-[26px] font-bold text-foreground">
        Achievers CAT — Admin
      </h1>
      <p className="mt-2 text-[14px] text-muted">
        This area should sit behind an admin-only route guard checked against
        the <code className="rounded bg-surface-muted px-1.5 py-0.5">role</code>{" "}
        column on the user&apos;s profile.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-white p-4">
            <s.icon size={16} className="text-brand-dark" />
            <p className="mt-2 font-display text-[19px] font-bold text-foreground">
              {s.value}
            </p>
            <p className="text-[12px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-2xl border border-border bg-white p-5 transition hover:border-brand hover:shadow-md hover:shadow-brand/[0.06]"
          >
            <p className="font-display text-[15px] font-semibold text-foreground">
              {s.title}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              {s.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
