import { Navigate, Outlet, useLocation } from "react-router-dom";
import Player from "./Player";
import BottomNav from "./BottomNav";
import DesktopSidebar from "./DesktopSidebar";
import "./AppShell.css";

export default function AuthenticatedLayout() {
  const token = localStorage.getItem("groove_token");
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

  const isAdminRoute = ["/admin", "/admin-secret"].includes(location.pathname);

  if (isAdminRoute) {
    return <Outlet />;
  }

  return (
    <div className="shell-layout">
      <DesktopSidebar />
      <div className="shell-main-region">
        <Outlet />
      </div>
      <Player />
      <BottomNav />
    </div>
  );
}
