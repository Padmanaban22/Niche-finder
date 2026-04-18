"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type UntappedNicheRow = {
  channelId?: string;
  channelName: string;
  channelUrl: string;
  channelCreationDate: string;
  firstVideoTitle: string;
  firstVideoUrl: string;
  firstVideoViews: number;
  firstVideoUploadDate: string;
  nicheLabel: string;
  detectedLanguage: string;
  competitionLevel: number;
  uploadsPerDay?: number;
  performanceSeries?: Array<{ date: string; views: number; title: string; videoId?: string }>;
  untappedReason: string;
};

export function UntappedNicheTable({ data }: { data: UntappedNicheRow[] }) {
  const formatDate = (value: string): string => {
    if (!value) return "Unknown";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unknown";
    return parsed.toLocaleDateString();
  };

  return (
    <Table>
      <TableHeader className="bg-muted/50 sticky top-0 z-10">
        <TableRow>
          <TableHead>Channel</TableHead>
          <TableHead>Channel Created</TableHead>
          <TableHead>First Video</TableHead>
          <TableHead className="text-right">Views</TableHead>
          <TableHead>Upload Date</TableHead>
          <TableHead>Niche/Sub-niche</TableHead>
          <TableHead>Language</TableHead>
          <TableHead className="text-right">Videos/Day</TableHead>
          <TableHead className="text-right">Competition</TableHead>
          <TableHead>Why Untapped</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={`${row.channelUrl}-${row.firstVideoUrl}`}>
            <TableCell className="max-w-[220px]">
              <a href={row.channelUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                {row.channelName}
              </a>
            </TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(row.channelCreationDate)}</TableCell>
            <TableCell className="max-w-[280px]">
              <a href={row.firstVideoUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                {row.firstVideoTitle}
              </a>
            </TableCell>
            <TableCell className="text-right">{row.firstVideoViews.toLocaleString()}</TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(row.firstVideoUploadDate)}</TableCell>
            <TableCell className="max-w-[220px]">{row.nicheLabel}</TableCell>
            <TableCell>{row.detectedLanguage.toUpperCase()}</TableCell>
            <TableCell className="text-right">{row.uploadsPerDay?.toFixed(2) ?? "-"}</TableCell>
            <TableCell className="text-right">{row.competitionLevel}</TableCell>
            <TableCell className="max-w-[280px]">{row.untappedReason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
