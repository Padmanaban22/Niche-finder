"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { OutlierChart } from "@/components/OutlierChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { estimateShortsRevenue, SHORTS_RPM_MAP, getEstimatedRPM } from "@/lib/shorts-rpm";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ChannelDeepDive() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("US");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/youtube/channel/${params.id}`);
        const parsed = await res.json();
        if (res.ok) setData(parsed);
        else toast.error(parsed.error);
      } catch (e) {
        toast.error("Failed to load channel data");
      }
      setLoading(false);
    }
    fetchData();
  }, [params.id]);

  if (loading) return <div className="h-full flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!data) return <div>No data available</div>;

  const { channel, videos, stats } = data;
  
  // Last 30 days calculation logic for revenue est:
  // Usually we treat the last 50 videos and scale to 1 month roughly, or just use avgViews * uploadsPerMonth
  const timeDiff = new Date(videos[0]?.publishedAt).getTime() - new Date(videos[videos.length - 1]?.publishedAt).getTime();
  const daysDiff = Math.max(timeDiff / (1000 * 3600 * 24), 1);
  const uploadsPerMonth = (videos.length / daysDiff) * 30;
  
  const estMonthlyViews = stats.avgViews * uploadsPerMonth;
  const estRev = estimateShortsRevenue(stats.avgViews, region) * uploadsPerMonth;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {channel.thumbnail && <img src={channel.thumbnail} alt={channel.name} className="w-16 h-16 rounded-full" />}
        <div>
          <h1 className="text-3xl font-bold">{channel.name}</h1>
          <p className="text-muted-foreground">{channel.subs.toLocaleString()} subscribers • {channel.totalVideos.toLocaleString()} total videos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Avg. Views</CardTitle>
            <CardDescription>Last 50 videos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card className="col-span-2 flex justify-between items-center pr-6">
          <div className="flex-1 space-y-1 pl-6 pt-6 pb-6">
            <p className="text-sm text-muted-foreground font-medium">Estimated Shorts Revenue / mo</p>
            <div className="text-3xl font-bold flex items-center gap-2">
              <span className="text-green-500">${estRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <p className="text-xs text-muted-foreground">Based on {uploadsPerMonth.toFixed(0)} uploads/mo</p>
          </div>
          <div className="w-32">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(SHORTS_RPM_MAP).map(k => (
                  <SelectItem key={k} value={k}>{k} (${SHORTS_RPM_MAP[k]})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Chart</CardTitle>
          <CardDescription>View trajectory for the last 50 uploads</CardDescription>
        </CardHeader>
        <CardContent>
          <OutlierChart data={videos} avgViews={stats.avgViews} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest 50 Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Published</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium max-w-[300px] truncate" title={v.title}>{v.title}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {new Date(v.publishedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">{v.duration.replace('PT','')}</TableCell>
                  <TableCell className="text-right font-semibold">{v.views.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {v.isOutlier ? (
                      <Badge className="bg-green-500/20 text-green-500">{v.outlierRatio}x Avg</Badge>
                    ) : v.isUnderperformer ? (
                      <Badge className="bg-red-500/20 text-red-500">{v.outlierRatio}x Avg</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">{v.outlierRatio}x</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
