import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DAY = ["D", "L", "M", "X", "J", "V", "S"];
const COLORS = ["#FF2D55", "#007AFF", "#34C759", "#FF9F0A", "#AF52DE", "#5AC8FA", "#FF3B30", "#8E8E93"];

function Tip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-popover px-3 py-2 text-xs shadow-float">
      <p className="text-muted-foreground">{label}</p>
      <p className="tabular font-semibold">{Math.round(payload[0].value).toLocaleString("es")} kg</p>
    </div>
  );
}

export function WeekVolumeChart({ data }: { data: { day: number; volume: number }[] }) {
  const series = DAY.map((name, i) => ({
    name,
    volume: data.find((d) => d.day === i)?.volume ?? 0,
  }));
  return (
    <div className="h-44 w-full min-w-0 overflow-x-clip">
      <ResponsiveContainer>
        <BarChart data={series} barSize={18}>
          <CartesianGrid stroke="rgba(142,142,147,0.15)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#8E8E93", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="volume" fill="#FF2D55" radius={[8, 8, 8, 8]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MusclePie({ data }: { data: { muscle: string; volume: number }[] }) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay datos de músculos.</p>;
  }
  const series = data;
  return (
    <div className="flex items-center gap-3">
      <div className="h-36 w-36 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={series} dataKey="volume" nameKey="muscle" innerRadius={38} outerRadius={58} paddingAngle={3}>
              {series.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {series.slice(0, 5).map((m, i) => (
          <li key={m.muscle} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 truncate">
              <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {m.muscle}
            </span>
            <span className="tabular text-muted-foreground">{Math.round(m.volume).toLocaleString("es")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeightLine({ data }: { data: { date: string; weight: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Registra tu peso para ver la curva.</p>;
  }
  return (
    <div className="h-44 w-full min-w-0 overflow-x-clip">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(142,142,147,0.15)" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="rounded-2xl border border-border bg-popover px-3 py-2 text-xs">
                  <p className="tabular font-semibold">{payload[0].value} kg</p>
                </div>
              ) : null
            }
          />
          <Line type="monotone" dataKey="weight" stroke="#FF2D55" strokeWidth={2.4} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeBars({ data }: { data: { month: string; volume: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay volumen mensual.</p>;
  }
  return (
    <div className="h-44 w-full min-w-0 overflow-x-clip">
      <ResponsiveContainer>
        <BarChart data={data} barSize={22}>
          <XAxis dataKey="month" tick={{ fill: "#8E8E93", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="volume" fill="#007AFF" radius={[8, 8, 8, 8]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
