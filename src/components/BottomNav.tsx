import { NavLink, useLocation } from "react-router-dom";
import { HomeIcon, CompassIcon, SearchIcon, LibraryIcon, UserIcon } from "./Icons";
import "./BottomNav.css";

const ITEMS = [
  { to: "/", label: "Accueil", Icon: HomeIcon, end: true },
  { to: "/discover", label: "Découvrir", Icon: CompassIcon, hero: true },
  { to: "/search", label: "Recherche", Icon: SearchIcon },
  { to: "/library", label: "Biblio", Icon: LibraryIcon },
  { to: "/profile", label: "Profil", Icon: UserIcon },
];

export function BottomNav() {
  const { pathname } = useLocation();
  // The reader owns the full screen; the dock would compete with immersion.
  if (pathname.startsWith("/reader")) return null;

  return (
    <nav className="dock" aria-label="Navigation principale">
      <ul className="dock__list">
        {ITEMS.map(({ to, label, Icon, end, hero }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `dock__item${isActive ? " is-active" : ""}${hero ? " dock__item--hero" : ""}`
              }
              aria-label={label}
            >
              <span className="dock__icon"><Icon /></span>
              <span className="dock__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
