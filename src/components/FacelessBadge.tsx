"use client";

import { Badge } from "@/components/ui/badge";

export function FacelessBadge({ level, score }: { level: string; score: number }) {
  if (level === "High") {
    return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">High ({score})</Badge>;
  }
  if (level === "Medium") {
    return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50">Medium ({score})</Badge>;
  }
  return <Badge className="bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border-slate-500/50">Low ({score})</Badge>;
}
