import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// 1. CUSTOM SVG: Spotify-Style Home
const HomeIcon = ({ active }) =>
  active ? (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="#ffffff"
      stroke="#ffffff"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* The strokeWidth="1.5" physically rounds off the sharp corners! */}
      <path d="M4 10L12 3l8 7v9a2 2 0 0 1-2 2h-4v-6h-4v6H6a2 2 0 0 1-2-2v-9z" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="#a89f98"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10L12 3l8 7v9a2 2 0 0 1-2 2h-4v-6h-4v6H6a2 2 0 0 1-2-2v-9z" />
    </svg>
  );
// 2. CUSTOM SVG: Spotify-Style Search
const SearchIcon = ({ active }) => (
  <svg
    viewBox="0 0 24 24"
    width="28"
    height="28"
    fill="none"
    stroke={active ? "#ffffff" : "#a89f98"}
    strokeWidth={active ? 3 : 2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Spotify just aggressively thickens the stroke for the active search icon */}
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// 3. CUSTOM SVG: Spotify-Style Stacked Books
const LibraryIcon = ({ active }) =>
  active ? (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#ffffff">
      {/* Solid stacked books */}
      <rect x="3" y="3" width="4" height="18" rx="1" />
      <rect x="10" y="3" width="4" height="18" rx="1" />
      <path d="M21 4.5l-4 16.5a1 1 0 0 1-1.2.7l-.5-.1a1 1 0 0 1-.7-1.2l4-16.5a1 1 0 0 1 1.2-.7l.5.1a1 1 0 0 1 .7 1.2z" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="#a89f98"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outlined stacked books */}
      <rect x="3" y="3" width="4" height="18" rx="1" />
      <rect x="10" y="3" width="4" height="18" rx="1" />
      <path d="M21 4.5l-4 16.5a1 1 0 0 1-1.2.7l-.5-.1a1 1 0 0 1-.7-1.2l4-16.5a1 1 0 0 1 1.2-.7l.5.1a1 1 0 0 1 .7 1.2z" />
    </svg>
  );

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isDesktop || ["/", "/login", "/register"].includes(location.pathname))
    return null;

  return (
    <nav className="bottom-nav">
      <div
        className={`nav-item ${location.pathname === "/home" ? "active" : ""}`}
        onClick={() => navigate("/home")}
      >
        <HomeIcon active={location.pathname === "/home"} />
        <span>Home</span>
      </div>

      <div
        className={`nav-item ${location.pathname === "/search" ? "active" : ""}`}
        onClick={() => navigate("/search")}
      >
        <SearchIcon active={location.pathname === "/search"} />
        <span>Search</span>
      </div>

      <div
        className={`nav-item ${location.pathname === "/library" ? "active" : ""}`}
        onClick={() => navigate("/library")}
      >
        <LibraryIcon active={location.pathname === "/library"} />
        <span>Library</span>
      </div>
    </nav>
  );
}
