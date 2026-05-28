import { Navigate, Outlet } from "react-router-dom";
import Player from "./Player";
import BottomNav from "./BottomNav";

export default function AuthenticatedLayout() {
  const token = localStorage.getItem("groove_token");

  if (!token) return <Navigate to="/login" replace />;

  return (
    <>
      <Outlet />
      <Player />
      <BottomNav />
    </>
  );
}
