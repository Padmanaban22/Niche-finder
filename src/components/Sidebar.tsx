"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bookmark, BarChart2, Settings, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Saved Niches", icon: Bookmark, href: "/saved" },
  { label: "Compare", icon: BarChart2, href: "/compare" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center px-6 border-b border-border text-primary font-bold text-lg gap-2">
        <Target className="w-5 h-5" />
        NicheHunter
      </div>
      <div className="flex-1 py-6 px-4 flex flex-col gap-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
              pathname.startsWith(route.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <route.icon className="w-4 h-4" />
            {route.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
