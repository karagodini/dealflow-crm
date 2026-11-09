"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/money";

export function RevenueChart({
  data,
  currency,
}: {
  data: { label: string; paidCents: number }[];
  currency: string;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={72}
            tickFormatter={(value) => formatMoney(Number(value), currency)}
          />
          <Tooltip formatter={(value) => formatMoney(Number(value ?? 0), currency)} />
          <Area
            type="monotone"
            dataKey="paidCents"
            name="Paid"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.18}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PipelineChart({
  data,
  currency,
}: {
  data: { stage: string; valueCents: number }[];
  currency: string;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 4, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="stage" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={72}
            tickFormatter={(value) => formatMoney(Number(value), currency)}
          />
          <Tooltip formatter={(value) => formatMoney(Number(value ?? 0), currency)} />
          <Bar dataKey="valueCents" name="Open" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
