import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f6f8f6] md:flex">
      <DashboardSidebar />
      <main className="min-w-0 flex-1 px-6 pb-10 pt-20 md:px-10 md:pt-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}