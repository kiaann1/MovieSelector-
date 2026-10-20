"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Search", icon: SearchIcon },
  { href: "/for-you", label: "For you", icon: SparkIcon },
  { href: "/watchlist", label: "List", icon: ListIcon },
  { href: "/watched", label: "Watched", icon: CheckIcon },
  { href: "/account", label: "Account", icon: UserIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const unlock = pathname === "/unlock";

  if (unlock) {
    return <>{children}</>;
  }

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <p className="brand-mark text-gold text-xs">MovieSelector</p>
          <p className="mt-2 font-display text-2xl text-cream leading-tight">Your reel</p>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`app-sidebar-link ${active ? "is-active" : ""}`}
              >
                <Icon active={active} />
                <span>{label === "List" ? "Watchlist" : label === "For you" ? "You may like" : label}</span>
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto pt-6 text-xs text-muted/70 leading-relaxed">
          Films & series, rated your way.
        </p>
      </aside>

      <div className="app-main">{children}</div>

      <nav className="app-bottom-nav" aria-label="Primary">
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1 min-w-0">
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition ${
                    active ? "text-gold" : "text-muted hover:text-cream"
                  }`}
                >
                  <Icon active={active} />
                  <span className="truncate max-w-full">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="7" opacity={active ? 1 : 0.9} />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden opacity={active ? 1 : 0.9}>
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" strokeLinejoin="round" />
      <path d="M18 15l.7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15z" strokeLinejoin="round" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden opacity={active ? 1 : 0.9}>
      <path d="M8 7h12M8 12h12M8 17h12" strokeLinecap="round" />
      <circle cx="4" cy="7" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" opacity={active ? 1 : 0.85} />
      <path d="M7 12l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden opacity={active ? 1 : 0.9}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5" strokeLinecap="round" />
    </svg>
  );
}
