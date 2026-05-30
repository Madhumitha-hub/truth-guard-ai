import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon, Video, AudioLines, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · DeepGuard AI" }] }),
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value, tone = "primary" }: { icon: typeof ShieldCheck; label: string; value: string | number; tone?: "primary" | "success" | "warning" | "destructive" }) {
  const toneCls = { primary: "text-primary", success: "text-success", warning: "text-warning", destructive: "text-destructive" }[tone];
  return (
    <div className="glass rounded-2xl p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-card ${toneCls}`}><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["detections-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detection_results")
        .select("prediction, media_files(media_type), created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const total = rows.length;
  const authentic = rows.filter(r => r.prediction === "Authentic").length;
  const fake = rows.filter(r => r.prediction === "Fake").length;
  const suspicious = rows.filter(r => r.prediction === "Suspicious").length;

  const pie = [
    { name: "Authentic", value: authentic, fill: "oklch(0.72 0.18 150)" },
    { name: "Suspicious", value: suspicious, fill: "oklch(0.78 0.16 75)" },
    { name: "Fake", value: fake, fill: "oklch(0.65 0.24 25)" },
  ];

  const byType = ["image", "video", "audio"].map(t => ({
    type: t,
    // @ts-expect-error joined relation
    count: rows.filter(r => r.media_files?.media_type === t).length,
  }));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live metrics across your verifications.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Total scans" value={total} />
        <StatCard icon={ShieldCheck} label="Authentic" value={authentic} tone="success" />
        <StatCard icon={ShieldAlert} label="Suspicious" value={suspicious} tone="warning" />
        <StatCard icon={ShieldX} label="Fake" value={fake} tone="destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold">Verdict distribution</h3>
          <div className="h-64">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={4}>
                    {pie.map((p, i) => <Cell key={i} fill={p.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.21 0.03 262)", border: "1px solid oklch(0.30 0.03 262)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold">Scans by media type</h3>
          <div className="h-64">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.03 262 / 0.4)" />
                  <XAxis dataKey="type" stroke="oklch(0.70 0.03 250)" />
                  <YAxis stroke="oklch(0.70 0.03 250)" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "oklch(0.21 0.03 262)", border: "1px solid oklch(0.30 0.03 262)" }} />
                  <Bar dataKey="count" fill="oklch(0.82 0.16 215)" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
      </div>

      {total === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <h3 className="text-lg font-semibold">No scans yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Run your first verification from the sidebar to populate analytics.</p>
        </div>
      )}
    </div>
  );
}

function EmptyChart() {
  return <div className="grid h-full place-items-center text-sm text-muted-foreground">No data yet</div>;
}
