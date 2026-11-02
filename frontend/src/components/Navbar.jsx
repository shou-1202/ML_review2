import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/kmeans", label: "U3 K-Means", short: "U3" },
  { to: "/markov", label: "U4 Markov", short: "U4" },
];

/**
 * A pale glacier-blue bar over the dark heroes that turns snow-white once the
 * hero has scrolled away.
 */
export default function Navbar() {
  const [solid, setSolid] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 text-navy backdrop-blur-md transition-[background-color,box-shadow] duration-300 ${
        solid ? "bg-snow/90 shadow-[0_1px_0_#CDD9E1]" : "bg-frost/95 shadow-[0_1px_0_rgba(255,255,255,0.35)]"
      }`}
    >
      <div className="page-x flex h-16 items-center justify-between gap-6">
        <NavLink to="/" className="group flex items-baseline gap-3" aria-label="Shako Lake — home">
          <span className="font-serif text-[22px] font-semibold uppercase leading-none tracking-[0.18em]">
            Shako Lake
          </span>
          <span className="hidden font-mono text-[11px] text-muted lg:inline">
            ML research lab
          </span>
        </NavLink>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `relative whitespace-nowrap px-2.5 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors sm:px-3 ${
                  isActive ? "text-navy" : "text-navy/60 hover:text-navy"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {link.short ? (
                    <>
                      <span className="hidden sm:inline">{link.label}</span>
                      <span className="sm:hidden" aria-label={link.label}>
                        {link.short}
                      </span>
                    </>
                  ) : (
                    link.label
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-2.5 -bottom-[1px] h-[2px] bg-coral transition-transform duration-300 sm:inset-x-3 ${
                      isActive ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
