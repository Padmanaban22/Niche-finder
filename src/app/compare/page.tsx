"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Plus, Loader2 } from "lucide-react";

export default function ComparePage() {
  const [niches, setNiches] = useState<string[]>([""]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    const validNiches = niches.filter(n => n.trim().length > 0);
    if (validNiches.length < 2) return;
    
    setLoading(true);
    const newResults = [];
    
    for (const niche of validNiches) {
      try {
        const res = await fetch("/api/youtube/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: niche, maxResults: 10 })
        });
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const channels = data.data;
          const avgSubs = channels.reduce((a: any, b: any) => a + (b.subs || 0), 0) / channels.length;
          const avgViews = channels.reduce((a: any, b: any) => a + (b.avgViews || 0), 0) / channels.length;
          const avgOutlier = channels.reduce((a: any, b: any) => a + (b.outlierScore || 0), 0) / channels.length;
          
          newResults.push({
            niche,
            density: channels.length,
            avgSubs: Math.round(avgSubs),
            avgViews: Math.round(avgViews),
            avgOutlier: Number(avgOutlier.toFixed(2)),
          });
        }
      } catch (e) {
        console.error("Failed to fetch", niche);
      }
    }
    
    setResults(newResults);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compare Niches</h1>
        <p className="text-muted-foreground">Enter up to 5 niches to compare their average statistics.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {niches.map((niche, index) => (
            <div key={index} className="flex gap-2 max-w-xl">
              <Input 
                value={niche} 
                onChange={e => {
                  const newN = [...niches];
                  newN[index] = e.target.value;
                  setNiches(newN);
                }}
                placeholder={`Niche ${index + 1}`}
              />
              {niches.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setNiches(niches.filter((_, i) => i !== index))}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => niches.length < 5 && setNiches([...niches, ""])} disabled={niches.length >= 5}>
              <Plus className="w-4 h-4 mr-2" /> Add Niche
            </Button>
            <Button onClick={handleCompare} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Run Comparison
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Niche Keyword</TableHead>
                  <TableHead className="text-right">Avg Subs</TableHead>
                  <TableHead className="text-right">Avg Views/Vid</TableHead>
                  <TableHead className="text-right">Avg Outlier</TableHead>
                  <TableHead className="text-right">Competition Data Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold">{r.niche}</TableCell>
                    <TableCell className="text-right">{r.avgSubs.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.avgViews.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-500">{r.avgOutlier}x</TableCell>
                    <TableCell className="text-right">{r.density}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
