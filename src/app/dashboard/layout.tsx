"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex gap-2 bg-card p-1 rounded-lg border border-border w-fit">
        <Link 
          href="/dashboard"
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md focus:outline-none transition-colors",
            pathname === "/dashboard" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Shorts Finder
        </Link>
        <Link 
          href="/dashboard/longform"
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md focus:outline-none transition-colors",
            pathname === "/dashboard/longform" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Longform AI Search
        </Link>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
