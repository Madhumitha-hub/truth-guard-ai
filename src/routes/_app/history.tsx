import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldAlert, ShieldX, Image as ImageIcon, Video, AudioLines } from "lucide-react";

export const Route = createFileRoute("/_app/history")({
  head: () => ({ meta: [{ title: "History · DeepGuard AI" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detection_results")
        .select("id, prediction, risk_level, manipulation_score, confidence_score, created_at, media_files(filename, media_type)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Detection history</h1>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">File</th>
              <th className="p-3">Type</th>
              <th className="p-3">Verdict</th>
              <th className="p-3">Risk</th>
              <th className="p-3">Manipulation</th>
              <th className="p-3">Confidence</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && (data ?? []).length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">
                No scans yet. <Link to="/detect/$type" params={{ type: "image" }} className="text-primary hover:underline">Run your first one</Link>.
              </td></tr>
            )}
            {(data ?? []).map((r) => {
              const mf = (r as { media_files?: { media_type?: string; filename?: string } }).media_files;
              const Icon = mf?.media_type === "video" ? Video : mf?.media_type === "audio" ? AudioLines : ImageIcon;
              const VerdictIcon = r.prediction === "Authentic" ? ShieldCheck : r.prediction === "Fake" ? ShieldX : ShieldAlert;
              const verdictCls = r.prediction === "Authentic" ? "text-success" : r.prediction === "Fake" ? "text-destructive" : "text-warning";
              return (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="p-3 max-w-[260px] truncate">{mf?.filename ?? "—"}</td>
                  <td className="p-3"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {mf?.media_type}</span></td>
                  <td className={`p-3 ${verdictCls}`}><span className="inline-flex items-center gap-1.5"><VerdictIcon className="h-3.5 w-3.5" /> {r.prediction}</span></td>
                  <td className="p-3">{r.risk_level}</td>
                  <td className="p-3 font-mono">{Number(r.manipulation_score).toFixed(1)}%</td>
                  <td className="p-3 font-mono">{Number(r.confidence_score).toFixed(1)}%</td>
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
