"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal, Loader2, X } from "lucide-react";
import { VideoTable } from "@/components/VideoTable";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [wasCached, setWasCached] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "any");
  const [durationFilter, setDurationFilter] = useState(searchParams.get("duration") || "any");
  const [languageFilter, setLanguageFilter] = useState(searchParams.get("lang") || "any");
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "");
  const [minViews, setMinViews] = useState(searchParams.get("minViews") || "");
  const [maxViews, setMaxViews] = useState(searchParams.get("maxViews") || "");

  // Sync to URL whenever they change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (dateFilter !== "any") params.set("date", dateFilter);
    if (durationFilter !== "any") params.set("duration", durationFilter);
    if (languageFilter !== "any") params.set("lang", languageFilter);
    if (dateFilter === "custom") {
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
    }
    if (minViews) params.set("minViews", minViews);
    if (maxViews) params.set("maxViews", maxViews);

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [query, dateFilter, durationFilter, languageFilter, dateFrom, dateTo, minViews, maxViews, pathname, router]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query) return;

    let publishedAfter: string | undefined = undefined;
    let publishedBefore: string | undefined = undefined;

    if (dateFilter === "custom") {
      if (dateFrom) publishedAfter = new Date(dateFrom).toISOString();
      if (dateTo) publishedBefore = new Date(dateTo).toISOString();
    } else if (dateFilter !== "any") {
      const now = new Date();
      switch (dateFilter) {
        case "24h": now.setHours(now.getHours() - 24); break;
        case "7d": now.setDate(now.getDate() - 7); break;
        case "30d": now.setDate(now.getDate() - 30); break;
        case "3m": now.setMonth(now.getMonth() - 3); break;
        case "6m": now.setMonth(now.getMonth() - 6); break;
        case "1y": now.setFullYear(now.getFullYear() - 1); break;
        case "2y": now.setFullYear(now.getFullYear() - 2); break;
      }
      publishedAfter = now.toISOString();
    }

    setLoading(true);
    try {
      const res = await fetch("/api/youtube/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          filters: { publishedAfter, publishedBefore, videoDuration: durationFilter, language: languageFilter, minViews, maxViews }
        })
      });
      const data = await res.json();

      if (res.ok) {
        setResults(data.data || []);
        setWasCached(data.cached);
        if (data.cached) {
          toast.success("Loaded from cache (0 quota used)");
        } else {
          toast.success("Search complete");
        }
      } else {
        toast.error(data.error || "Search failed");
      }
    } catch (e) {
      toast.error("Network error during search");
    }
    setLoading(false);
  };

  const activeFilters = [];
  if (dateFilter !== "any") {
    let label = dateFilter;
    if (dateFilter === "24h") label = "Last 24 hours";
    else if (dateFilter === "7d") label = "Last 7 days";
    else if (dateFilter === "30d") label = "Last 30 days";
    else if (dateFilter === "3m") label = "Last 3 months";
    else if (dateFilter === "6m") label = "Last 6 months";
    else if (dateFilter === "1y") label = "Last 1 year";
    else if (dateFilter === "2y") label = "Last 2 years";
    else if (dateFilter === "custom") label = `Custom: ${dateFrom || "*"} - ${dateTo || "*"}`;
    activeFilters.push({ id: "date", label, onRemove: () => setDateFilter("any") });
  }
  if (durationFilter !== "any") {
    let label = durationFilter;
    if (durationFilter === "short") label = "Short (< 4m)";
    else if (durationFilter === "medium") label = "Medium (4-20m)";
    else if (durationFilter === "long") label = "Long (> 20m)";
    activeFilters.push({ id: "duration", label, onRemove: () => setDurationFilter("any") });
  }
  if (languageFilter !== "any") {
    const langMap: Record<string, string> = { "en": "English", "es": "Spanish", "fr": "French", "hi": "Hindi", "ja": "Japanese", "pt": "Portuguese", "de": "German", "kr": "Korean" };
    activeFilters.push({ id: "lang", label: langMap[languageFilter] || languageFilter, onRemove: () => setLanguageFilter("any") });
  }
  if (minViews) activeFilters.push({ id: "minViews", label: `Min ` + (Number(minViews) >= 1000000 ? `${Number(minViews) / 1000000}M` : `${Number(minViews) / 1000}K`) + ` views`, onRemove: () => setMinViews("") });
  if (maxViews) activeFilters.push({ id: "maxViews", label: `Max ` + (Number(maxViews) >= 1000000 ? `${Number(maxViews) / 1000000}M` : `${Number(maxViews) / 1000}K`) + ` views`, onRemove: () => setMaxViews("") });

  const resetFilters = () => {
    setDateFilter("any");
    setDurationFilter("any");
    setLanguageFilter("any");
    setDateFrom("");
    setDateTo("");
    setMinViews("");
    setMaxViews("");
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Niche Research</h1>
        <p className="text-muted-foreground">Find potential high-RPM, faceless, low-competition channels in any niche.</p>
      </div>

      <div className="flex gap-4 items-end">
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl flex gap-2 relative">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search niches (e.g. 'scary stories', 'history facts')..."
            className="pl-10 h-12 text-lg bg-card"
          />
          <Search className="w-5 h-5 absolute left-3 top-3.5 text-muted-foreground" />
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze Niche"}
          </Button>
        </form>

        <Button variant={showFilters ? "default" : "outline"} size="lg" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {showFilters && (
          <Card className="w-64 p-4 shrink-0 overflow-y-auto hidden lg:block space-y-6">
            <div>
              <h3 className="font-semibold mb-4 flex justify-between items-center text-sm">
                Filters
                {(dateFilter !== "any" || durationFilter !== "any" || languageFilter !== "any" || minViews || maxViews) && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground">Reset Filters</Button>
                )}
              </h3>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Published Within</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="any">Any time (default)</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="3m">Last 3 months</SelectItem>
                  <SelectItem value="6m">Last 6 months</SelectItem>
                  <SelectItem value="1y">Last 1 year</SelectItem>
                  <SelectItem value="2y">Last 2 years</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === "custom" && (
                <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="w-full space-y-1">
                    <label className="text-xs text-muted-foreground mt-1">From</label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-full" />
                  </div>
                  <div className="w-full space-y-1">
                    <label className="text-xs text-muted-foreground mt-1">To</label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-full" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Video Duration</label>
              <Select value={durationFilter} onValueChange={setDurationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Any duration" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="any">Any duration</SelectItem>
                  <SelectItem value="short">Short (&lt; 4 min)</SelectItem>
                  <SelectItem value="medium">Medium (4 - 20 min)</SelectItem>
                  <SelectItem value="long">Long (&gt; 20 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Video Language</label>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Any language" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="any">Any language</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="kr">Korean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Exact Video Views</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {["10000", "100000", "500000", "1000000", "10000000"].map(val => (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-[10px] px-1.5 py-0 font-medium transition-colors"
                    onClick={() => setMinViews(val)}
                  >
                    {Number(val) >= 1000000 ? `${Number(val) / 1000000}M+` : `${Number(val) / 1000}K+`}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input type="number" placeholder="Min" value={minViews} onChange={e => setMinViews(e.target.value)} className="h-8 text-xs" />
                <Input type="number" placeholder="Max" value={maxViews} onChange={e => setMaxViews(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </Card>
        )}

        <Card className="flex-1 overflow-hidden flex flex-col">
          {activeFilters.length > 0 && results.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-3 bg-muted/30 border-b items-center">
              <span className="text-xs font-semibold text-muted-foreground mr-1 uppercase">Active Filters:</span>
              {activeFilters.map(f => (
                <Badge key={f.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 font-normal bg-background border">
                  {f.label}
                  <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full ml-1 hover:bg-destructive/20 hover:text-destructive text-muted-foreground" onClick={f.onRemove}>
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
              <div className="text-xs font-medium text-muted-foreground ml-auto bg-primary/10 text-primary px-2 py-1 rounded-full">
                Showing {results.length} matching videos
              </div>
            </div>
          )}

          {wasCached && (
            <div className="bg-primary/10 text-primary px-4 py-2 text-xs font-medium border-b border-primary/20">
              ⚡ Results loaded from cache
            </div>
          )}
          <div className="flex-1 overflow-y-auto overflow-x-auto p-0">
            {results.length > 0 ? (
              <VideoTable data={results} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                {loading ? "Analyzing videos across YouTube..." : "Search a niche to populate exact video results"}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 h-full flex justify-center items-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2"/> Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
