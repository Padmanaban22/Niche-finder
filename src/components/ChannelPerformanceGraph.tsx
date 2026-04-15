"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { UntappedNicheRow } from "@/components/UntappedNicheTable";

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString();
}

type GrowthMode = "manual" | "top3_growth" | "top5_growth";

export function ChannelPerformanceGraph({
  data,
  selectedChannelIds,
  onSelectedChannelIdsChange,
  growthMode,
  onGrowthModeChange,
}: {
  data: UntappedNicheRow[];
  selectedChannelIds?: string[];
  onSelectedChannelIdsChange?: (ids: string[]) => void;
  growthMode?: GrowthMode;
  onGrowthModeChange?: (mode: GrowthMode) => void;
}) {
  const [internalSelectedChannelIds, setInternalSelectedChannelIds] = useState<string[]>([]);
  const [internalGrowthMode, setInternalGrowthMode] = useState<GrowthMode>("manual");
  const currentSelectedChannelIds = selectedChannelIds ?? internalSelectedChannelIds;
  const currentGrowthMode = growthMode ?? internalGrowthMode;

  const channelsWithSeries = useMemo(
    () =>
      data
        .filter((row) => (row.performanceSeries || []).length > 0)
        .map((row, index) => ({
          channelId: row.channelId || row.channelUrl,
          seriesKey: `series_${index + 1}`,
          channelName: row.channelName,
          series: row.performanceSeries || [],
        })),
    [data]
  );

  const channelsByGrowth = useMemo(() => {
    return [...channelsWithSeries]
      .map((channel) => {
        const first = channel.series[0]?.views ?? 0;
        const last = channel.series[channel.series.length - 1]?.views ?? 0;
        const growthRate = first > 0 ? (last - first) / first : 0;
        return { ...channel, growthRate };
      })
      .sort((a, b) => b.growthRate - a.growthRate);
  }, [channelsWithSeries]);

  const activeChannelIds = useMemo(() => {
    if (currentGrowthMode === "top3_growth") {
      return channelsByGrowth.slice(0, 3).map((channel) => channel.channelId);
    }
    if (currentGrowthMode === "top5_growth") {
      return channelsByGrowth.slice(0, 5).map((channel) => channel.channelId);
    }
    if (currentSelectedChannelIds.length > 0) {
      return currentSelectedChannelIds;
    }
    return channelsWithSeries.slice(0, 4).map((channel) => channel.channelId);
  }, [currentGrowthMode, currentSelectedChannelIds, channelsByGrowth, channelsWithSeries]);

  const colorPalette = [
    "#6366f1",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#a855f7",
    "#84cc16",
    "#f97316",
  ];

  const chartConfig = useMemo(() => {
    const entries = activeChannelIds.map((id, index) => {
      const channel = channelsWithSeries.find((item) => item.channelId === id);
      return [
        channel?.seriesKey || `series_${index + 1}`,
        {
          label: channel?.channelName || `Channel ${index + 1}`,
          color: colorPalette[index % colorPalette.length],
        },
      ] as const;
    });
    return Object.fromEntries(entries) satisfies ChartConfig;
  }, [activeChannelIds, channelsWithSeries]);

  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>();
    for (const channel of channelsWithSeries) {
      if (!activeChannelIds.includes(channel.channelId)) continue;
      for (const point of channel.series) {
        const key = new Date(point.date).toISOString().slice(0, 10);
        if (!dateMap.has(key)) {
          dateMap.set(key, { date: key });
        }
        const existing = dateMap.get(key);
        if (existing) {
          existing[channel.seriesKey] = point.views;
        }
      }
    }
    return Array.from(dateMap.values())
      .sort((a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime())
      .map((row) => ({ ...row, dateLabel: formatDate(String(row.date)) }));
  }, [channelsWithSeries, activeChannelIds]);

  const toggleChannel = (channelId: string) => {
    const next = (() => {
      const prev = currentSelectedChannelIds;
      if (prev.includes(channelId)) {
        return prev.filter((id) => id !== channelId);
      }
      return [...prev, channelId].slice(0, 8);
    })();
    if (onSelectedChannelIdsChange) {
      onSelectedChannelIdsChange(next);
    } else {
      setInternalSelectedChannelIds(next);
    }
  };

  const setMode = (mode: GrowthMode) => {
    if (onGrowthModeChange) {
      onGrowthModeChange(mode);
    } else {
      setInternalGrowthMode(mode);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Channel Performance Graph</h3>
        <p className="text-xs text-muted-foreground">Select channels to compare their recent upload view trends on one chart.</p>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={currentGrowthMode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")} className="h-7 text-xs">Manual</Button>
        <Button type="button" size="sm" variant={currentGrowthMode === "top3_growth" ? "default" : "outline"} onClick={() => setMode("top3_growth")} className="h-7 text-xs">Top 3 Growth</Button>
        <Button type="button" size="sm" variant={currentGrowthMode === "top5_growth" ? "default" : "outline"} onClick={() => setMode("top5_growth")} className="h-7 text-xs">Top 5 Growth</Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {channelsWithSeries.slice(0, 12).map((channel) => {
          const selected = activeChannelIds.includes(channel.channelId);
          return (
            <Button
              key={channel.channelId}
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              onClick={() => {
                if (currentGrowthMode !== "manual") setMode("manual");
                toggleChannel(channel.channelId);
              }}
              className="h-7 text-xs"
            >
              {channel.channelName}
            </Button>
          );
        })}
      </div>
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}M`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  const configItem = chartConfig[String(name)];
                  return (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{Number(value).toLocaleString()} views</span>
                      <span className="text-muted-foreground">{String(configItem?.label || name)}</span>
                    </div>
                  );
                }}
              />
            }
          />
          {activeChannelIds.map((channelId) => {
            const channel = channelsWithSeries.find((item) => item.channelId === channelId);
            if (!channel) return null;
            return (
              <Line
                key={channelId}
                dataKey={channel.seriesKey}
                type="monotone"
                stroke={`var(--color-${channel.seriesKey})`}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ChartContainer>
      <div className="mt-4 flex flex-wrap gap-2">
        {channelsWithSeries.slice(0, 12).map((channel, index) => {
          const visible = activeChannelIds.includes(channel.channelId);
          return (
            <Button
              key={`legend-${channel.channelId}`}
              type="button"
              size="sm"
              variant={visible ? "secondary" : "outline"}
              onClick={() => {
                if (currentGrowthMode !== "manual") setMode("manual");
                toggleChannel(channel.channelId);
              }}
              className="h-7 text-xs"
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: colorPalette[index % colorPalette.length] }}
              />
              {channel.channelName}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
