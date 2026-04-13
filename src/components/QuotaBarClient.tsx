"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

export function QuotaBarClient() {
  const [quotaStats, setQuotaStats] = useState({ totalActive: 0, used: 0, remaining: 0, limit: 0 });

  const fetchQuota = async () => {
    try {
      const res = await fetch("/api/quota");
      if (res.ok) {
        const data = await res.json();
        setQuotaStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch quota stats");
    }
  };

  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  if (quotaStats.limit === 0) {
    return <div className="text-xs text-muted-foreground w-64 text-center">No active API keys found.</div>;
  }

  const percentUsed = (quotaStats.used / quotaStats.limit) * 100;
  const percentRemaining = 100 - percentUsed;

  let colorClass = "bg-green-500";
  if (percentRemaining < 20) colorClass = "bg-red-500";
  else if (percentRemaining < 50) colorClass = "bg-yellow-500";

  return (
    <div className="w-64 flex flex-col gap-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Quota Remaining</span>
        <span className="font-medium text-foreground">{quotaStats.remaining.toLocaleString()} / {quotaStats.limit.toLocaleString()}</span>
      </div>
      <Progress value={percentUsed} indicatorClass={colorClass} className="h-2" />
    </div>
  );
}
