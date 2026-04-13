"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

export function OutlierChart({ data, avgViews }: { data: any[]; avgViews: number }) {
  // data comes reverse chronological (newest first). Let's plot newest on the right -> so we reverse it.
  const chartData = [...data].reverse().map((d, i) => ({
    name: `V${i+1}`,
    views: d.views,
    title: d.title,
    isOutlier: d.isOutlier
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-card border p-3 rounded-md shadow flex flex-col gap-1 max-w-sm">
          <p className="text-sm font-semibold truncate">{p.title}</p>
          <p className="text-xs text-muted-foreground">{p.views.toLocaleString()} views</p>
          {p.isOutlier && <span className="text-xs text-green-500 font-bold">Outlier Detected!</span>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={avgViews} stroke="var(--primary)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="views"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={({ cx, cy, payload }) => {
              if (payload.isOutlier) {
                return <circle cx={cx} cy={cy} r={6} fill="#22c55e" stroke="none" />;
              }
              return <circle cx={cx} cy={cy} r={3} fill="var(--primary)" stroke="none" />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
