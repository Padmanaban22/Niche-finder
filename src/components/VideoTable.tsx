"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BookmarkPlus, Activity, ExternalLink } from "lucide-react";
import { FacelessBadge } from "./FacelessBadge";
import Link from "next/link";
import { Badge } from "./ui/badge";

export function VideoTable({ data }: { data: any[] }) {
  return (
    <Table>
      <TableHeader className="bg-muted/50 sticky top-0 z-10">
        <TableRow>
          <TableHead className="w-[300px]">Video</TableHead>
          <TableHead>Channel</TableHead>
          <TableHead className="text-right">Video Views</TableHead>
          <TableHead className="text-right">V/S Ratio</TableHead>
          <TableHead className="text-right">Published</TableHead>
          <TableHead>Faceless</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((video) => (
          <TableRow key={video.id} className="group">
            <TableCell className="font-medium">
              <div className="flex items-center gap-3">
                {video.thumbnail && (
                  <img src={video.thumbnail} alt={video.title} className="w-16 h-9 object-cover rounded" />
                )}
                <div className="max-w-[200px] flex flex-col gap-1">
                  <span className="truncate" title={video.title}>{video.title}</span>
                  <div className="flex gap-1 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="px-1 text-[10px] h-4 leading-none">
                      {video.durationMin < 1 ? "Shorts" : `${video.durationMin}m`}
                    </Badge>
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium truncate max-w-[120px]" title={video.channelName}>{video.channelName}</span>
                <span className="text-xs text-muted-foreground">
                  {video.channelSubs > 0 ? `${video.channelSubs.toLocaleString()} subs` : 'N/A subs'}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right font-semibold text-primary">{(video.views).toLocaleString()}</TableCell>
            <TableCell className="text-right text-muted-foreground">{video.viewsSubRatio}</TableCell>
            <TableCell className="text-right text-muted-foreground whitespace-nowrap">
              {new Date(video.publishedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <FacelessBadge level={video.facelessLevel} score={video.facelessScore} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" title="Save Niche">
                  <BookmarkPlus className="w-4 h-4" />
                </Button>
                <Link href={`/channel/${video.channelId}`}>
                  <Button variant="ghost" size="icon" title="Channel Deep Dive">
                    <Activity className="w-4 h-4" />
                  </Button>
                </Link>
                <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="icon" title="Watch on YouTube">
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
