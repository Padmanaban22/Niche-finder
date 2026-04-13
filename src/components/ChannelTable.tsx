"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BookmarkPlus, Activity, ExternalLink } from "lucide-react";
import { FacelessBadge } from "./FacelessBadge";
import Link from "next/link";
import { estimateShortsRevenue } from "@/lib/shorts-rpm";

export function ChannelTable({ data }: { data: any[] }) {
  return (
    <Table>
      <TableHeader className="bg-muted/50 sticky top-0 z-10">
        <TableRow>
          <TableHead className="w-[300px]">Channel</TableHead>
          <TableHead className="text-right">Subs</TableHead>
          <TableHead className="text-right">Videos</TableHead>
          <TableHead className="text-right">Avg Views</TableHead>
          <TableHead className="text-right">V/S Ratio</TableHead>
          <TableHead className="text-right">Uploads/Wk</TableHead>
          <TableHead className="text-right">Outlier Score</TableHead>
          <TableHead>Faceless</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((channel) => (
          <TableRow key={channel.id} className="group">
            <TableCell className="font-medium">
              <div className="flex items-center gap-3">
                {channel.thumbnail && (
                  <img src={channel.thumbnail} alt={channel.name} className="w-10 h-10 rounded-full" />
                )}
                <div className="max-w-[200px] truncate" title={channel.name}>{channel.name}</div>
              </div>
            </TableCell>
            <TableCell className="text-right">{channel.subs > 0 ? (channel.subs).toLocaleString() : 'N/A'}</TableCell>
            <TableCell className="text-right">{channel.totalVideos}</TableCell>
            <TableCell className="text-right font-semibold">{(channel.avgViews).toLocaleString()}</TableCell>
            <TableCell className="text-right text-muted-foreground">{channel.viewsSubRatio}</TableCell>
            <TableCell className="text-right">{channel.uploadFreq}</TableCell>
            <TableCell className="text-right text-green-500 font-bold">{channel.outlierScore}x</TableCell>
            <TableCell>
              <FacelessBadge level={channel.facelessLevel} score={channel.facelessScore} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" title="Save Niche">
                  <BookmarkPlus className="w-4 h-4" />
                </Button>
                <Link href={`/channel/${channel.id}`}>
                  <Button variant="ghost" size="icon" title="Deep Dive">
                    <Activity className="w-4 h-4" />
                  </Button>
                </Link>
                <a href={`https://youtube.com/channel/${channel.id}`} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="icon" title="Open in YouTube">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </a>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
