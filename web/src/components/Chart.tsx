import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const COLORS = [
  "#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#eab308", "#10b981", "#f97316",
];

const tooltipStyle = {
  backgroundColor: "var(--panel)",
  border: "1px solid var(--line)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--ink)",
};

interface BarChartProps {
  data: { name: string; value: number }[];
  color?: string;
  horizontal?: boolean;
  height?: number;
  valueFormatter?: (v: number) => string;
}

export function SimpleBarChart({ data, color = "#2563eb", horizontal, height = 220, valueFormatter }: BarChartProps) {
  if (data.length === 0) return null;
  const fmt = valueFormatter || ((v: number) => String(v));
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(height, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} width={120} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface GroupedBarProps {
  data: { name: string; [key: string]: string | number }[];
  keys: { key: string; color: string; label: string }[];
  horizontal?: boolean;
  height?: number;
  valueFormatter?: (v: number) => string;
}

export function GroupedBarChart({ data, keys, horizontal, height = 260, valueFormatter }: GroupedBarProps) {
  if (data.length === 0) return null;
  const fmt = valueFormatter || ((v: number) => String(v));
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(height, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} width={100} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
          {keys.map((k) => (
            <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color} radius={[0, 4, 4, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
        {keys.map((k) => (
          <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface AreaChartProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
}

export function AreaLineChart({ data, color = "#ef4444", height = 220, valueFormatter }: AreaChartProps) {
  if (data.length === 0) return null;
  const fmt = valueFormatter || ((v: number) => String(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(Number(v))} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface DonutProps {
  data: { name: string; value: number }[];
  height?: number;
}

export function DonutChart({ data, height = 220 }: DonutProps) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--panel)", border: "1px solid var(--line)", minHeight: "280px" }}
    >
      <h3
        className="text-xs uppercase tracking-wider font-medium mb-3"
        style={{ color: "var(--muted)", letterSpacing: "0.06em" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
      {children}
    </div>
  );
}
