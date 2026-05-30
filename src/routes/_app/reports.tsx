import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports · DeepGuard AI" }] }),
  component: () => (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Reports</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reports are generated on demand from your detection results. Open any scan from{" "}
        <Link to="/history" className="text-primary hover:underline">History</Link> and use the Download
        buttons after running an analysis to export PDF, CSV or JSON.
      </p>
    </div>
  ),
});
