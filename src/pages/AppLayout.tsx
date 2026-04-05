import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const AppLayout = () => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto max-w-lg bottom-nav-safe">
      <Outlet />
    </div>
    <BottomNav />
  </div>
);

export default AppLayout;
