import { useEffect } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { BottomNav } from "@/components/BottomNav";
import { Onboarding } from "@/screens/Onboarding";
import { Home } from "@/screens/Home";
import { Discover } from "@/screens/Discover";
import { Search } from "@/screens/Search";
import { Library } from "@/screens/Library";
import { Profile } from "@/screens/Profile";
import { Detail } from "@/screens/Detail";
import { Reader } from "@/screens/Reader";
import { OfflineBadge } from "@/components/OfflineBadge";
import { Ambient } from "@/components/Ambient";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // The feed and reader own their own scroll containers.
    if (pathname.startsWith("/discover") || pathname.startsWith("/reader")) return;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.onboarded);

  if (!hydrated) return null; // splash stays up until persisted state loads

  if (!onboarded) {
    return (
      <>
        <Ambient />
        <Onboarding />
      </>
    );
  }

  return (
    <>
      <Ambient />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/title/:id" element={<Detail />} />
        <Route path="/reader/:id" element={<Reader />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <OfflineBadge />
      <BottomNav />
    </>
  );
}
