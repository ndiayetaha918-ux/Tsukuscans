import { useEffect, useState } from "react";
import "./OfflineBadge.css";

/* Quiet, honest connectivity signal. Tsuki stays usable offline (app shell +
   local catalog are cached), so this informs rather than alarms. */
export function OfflineBadge() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="offbadge" role="status">
      <span className="offbadge__dot" />
      Hors-ligne — lecture locale disponible
    </div>
  );
}
