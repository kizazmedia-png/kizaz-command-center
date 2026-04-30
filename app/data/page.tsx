"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import { useSite } from "@/components/SiteContext";

interface GscRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  recentClicks?: number;
  priorClicks?: number;
  delta?: number;
  pct?: number;
}

interface Ga4Row {
  pagePath: string;
  pageTitle: string;
  views: number;
  sessions: number;
  bounceRate: number;
}

interface SnapshotRow {
  captured_at: string | { value: string };
  site: string;
  source: string;
  label: string | null;
  payload: any;
}

export default function DataPage() {
  const { data: session, status } = useSession();
  const { siteId, site } = useSite();

  const [gscMode, setGscMode] = useState<"topPages" | "declining">("topPages");
  const [gscRows, setGscRows] = useState<GscRow[]>([]);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState("");

  const [ga4Rows, setGa4Rows] = useState<Ga4Row[]>([]);
  const [ga4Loading, setGa4Loading] = useState(false);
  const [ga4Error, setGa4Error] = useState("");

  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [bqLoading, setBqLoading] = useState(false);
  const [bqError, setBqError] = useState("");
  const [bqStatus, setBqStatus] = useState("");

  const fetchGsc = async () => {
    setGscLoading(true);
    setGscError("");
    setGscRows([]);
    try {
      const res = await fetch("/api/gsc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: siteId, mode: gscMode }),
      });
      const data = await res.json();
      if (!res.ok) setGscError(data.error || "GSC fetch failed");
      else setGscRows(data.rows || []);
    } catch (e: any) {
      setGscError(e?.message || "Network error");
    } finally {
      setGscLoading(false);
    }
  };

  const fetchGa4 = async () => {
    setGa4Loading(true);
    setGa4Error("");
    setGa4Rows([]);
    try {
      const res = await fetch("/api/ga4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: siteId }),
      });
      const data = await res.json();
      if (!res.ok) setGa4Error(data.error || "GA4 fetch failed");
      else setGa4Rows(data.rows || []);
    } catch (e: any) {
      setGa4Error(e?.message || "Network error");
    } finally {
      setGa4Loading(false);
    }
  };

  const listSnapshots = async () => {
    setBqLoading(true);
    setBqError("");
    setBqStatus("");
    setSnapshots([]);
    try {
      const res = await fetch("/api/bigquery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", site: siteId, limit: 25 }),
      });
      const data = await res.json();
      if (!res.ok) setBqError(data.error || "BigQuery list failed");
      else setSnapshots(data.rows || []);
    } catch (e: any) {
      setBqError(e?.message || "Network error");
    } finally {
      setBqLoading(false);
    }
  };

  const storeGscSnapshot = async () => {
    if (!gscRows.length) {
      setBqError("Fetch GSC data first to store a snapshot.");
      return;
    }
    setBqLoading(true);
    setBqError("");
    setBqStatus("");
    try {
      const res = await fetch("/api/bigquery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "store",
          site: siteId,
          source: `gsc:${gscMode}`,
          label: `GSC ${gscMode} for ${site.name}`,
          payload: { rows: gscRows },
        }),
      });
      const data = await res.json();
      if (!res.ok) setBqError(data.error || "Store failed");
      else setBqStatus("Snapshot stored.");
    } catch (e: any) {
      setBqError(e?.message || "Network error");
    } finally {
      setBqLoading(false);
    }
  };

  const storeGa4Snapshot = async () => {
    if (!ga4Rows.length) {
      setBqError("Fetch GA4 data first to store a snapshot.");
      return;
    }
    setBqLoading(true);
    setBqError("");
    setBqStatus("");
    try {
      const res = await fetch("/api/bigquery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "store",
          site: siteId,
          source: "ga4:topPages",
          label: `GA4 top pages for ${site.name}`,
          payload: { rows: ga4Rows },
        }),
      });
      const data = await res.json();
      if (!res.ok) setBqError(data.error || "Store failed");
      else setBqStatus("Snapshot stored.");
    } catch (e: any) {
      setBqError(e?.message || "Network error");
    } finally {
      setBqLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Data"
        subtitle="Search Console, GA4, and BigQuery historical snapshots."
      />

      {status !== "loading" && !session && (
        <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center justify-between">
          <span>
            Sign in with Google to grant access to Search Console & GA4.
          </span>
          <button
            onClick={() => signIn("google")}
            className="bg-accent text-white px-3 py-1.5 rounded-md text-sm font-medium"
          >
            Sign in
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* GSC */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Google Search Console</h2>
              <p className="text-sm text-text">
                Last 28 days. Switch mode to find declining pages.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={gscMode}
                onChange={(e) => setGscMode(e.target.value as any)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="topPages">Top pages by clicks</option>
                <option value="declining">Declining traffic (vs prior 28d)</option>
              </select>
              <button
                onClick={fetchGsc}
                disabled={gscLoading}
                className="bg-accent hover:bg-accent/90 disabled:opacity-60 text-white text-sm px-4 py-1.5 rounded-md"
              >
                {gscLoading ? "Loading..." : "Fetch"}
              </button>
              <button
                onClick={storeGscSnapshot}
                disabled={!gscRows.length || bqLoading}
                className="border border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-sm px-3 py-1.5 rounded-md"
              >
                Save Snapshot
              </button>
            </div>
          </header>

          {gscError && <ErrorBox>{gscError}</ErrorBox>}
          {!gscRows.length && !gscError && !gscLoading && (
            <EmptyState>No data yet. Click Fetch to load GSC data.</EmptyState>
          )}
          {gscRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="py-2 pr-3">Page</th>
                    {gscMode === "topPages" ? (
                      <>
                        <th className="py-2 pr-3">Clicks</th>
                        <th className="py-2 pr-3">Impr.</th>
                        <th className="py-2 pr-3">CTR</th>
                        <th className="py-2 pr-3">Position</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 pr-3">Recent</th>
                        <th className="py-2 pr-3">Prior</th>
                        <th className="py-2 pr-3">Δ</th>
                        <th className="py-2 pr-3">% Change</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {gscRows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 pr-3 truncate max-w-[420px]">
                        <a
                          href={r.page}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:underline"
                        >
                          {r.page}
                        </a>
                      </td>
                      {gscMode === "topPages" ? (
                        <>
                          <td className="py-2 pr-3">{r.clicks}</td>
                          <td className="py-2 pr-3">{r.impressions}</td>
                          <td className="py-2 pr-3">{(r.ctr * 100).toFixed(1)}%</td>
                          <td className="py-2 pr-3">{r.position?.toFixed(1)}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-3">{r.recentClicks}</td>
                          <td className="py-2 pr-3">{r.priorClicks}</td>
                          <td className="py-2 pr-3 text-red-600">{r.delta}</td>
                          <td className="py-2 pr-3 text-red-600">
                            {r.pct?.toFixed(1)}%
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* GA4 */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Google Analytics 4</h2>
              <p className="text-sm text-text">
                Top pages by views (last 28 days).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchGa4}
                disabled={ga4Loading}
                className="bg-accent hover:bg-accent/90 disabled:opacity-60 text-white text-sm px-4 py-1.5 rounded-md"
              >
                {ga4Loading ? "Loading..." : "Fetch"}
              </button>
              <button
                onClick={storeGa4Snapshot}
                disabled={!ga4Rows.length || bqLoading}
                className="border border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-sm px-3 py-1.5 rounded-md"
              >
                Save Snapshot
              </button>
            </div>
          </header>

          {ga4Error && <ErrorBox>{ga4Error}</ErrorBox>}
          {!ga4Rows.length && !ga4Error && !ga4Loading && (
            <EmptyState>No data yet. Click Fetch to load GA4 data.</EmptyState>
          )}
          {ga4Rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="py-2 pr-3">Page</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Views</th>
                    <th className="py-2 pr-3">Sessions</th>
                    <th className="py-2 pr-3">Bounce</th>
                  </tr>
                </thead>
                <tbody>
                  {ga4Rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 pr-3 truncate max-w-[260px]">
                        {r.pagePath}
                      </td>
                      <td className="py-2 pr-3 truncate max-w-[280px]">
                        {r.pageTitle}
                      </td>
                      <td className="py-2 pr-3">{r.views}</td>
                      <td className="py-2 pr-3">{r.sessions}</td>
                      <td className="py-2 pr-3">
                        {(r.bounceRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* BigQuery snapshots */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">BigQuery Snapshots</h2>
              <p className="text-sm text-text">
                Historical snapshots of GSC and GA4 data, stored in your BigQuery dataset.
              </p>
            </div>
            <button
              onClick={listSnapshots}
              disabled={bqLoading}
              className="bg-accent hover:bg-accent/90 disabled:opacity-60 text-white text-sm px-4 py-1.5 rounded-md"
            >
              {bqLoading ? "Loading..." : "Load Snapshots"}
            </button>
          </header>

          {bqError && <ErrorBox>{bqError}</ErrorBox>}
          {bqStatus && (
            <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm">
              {bqStatus}
            </div>
          )}
          {!snapshots.length && !bqError && !bqLoading && (
            <EmptyState>
              No snapshots loaded. Click Load Snapshots to view history, or Save
              Snapshot above to store the current data.
            </EmptyState>
          )}
          {snapshots.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="py-2 pr-3">Captured</th>
                    <th className="py-2 pr-3">Site</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">Label</th>
                    <th className="py-2 pr-3">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s, i) => {
                    const ts =
                      typeof s.captured_at === "string"
                        ? s.captured_at
                        : s.captured_at?.value;
                    let payload: any = s.payload;
                    if (typeof payload === "string") {
                      try {
                        payload = JSON.parse(payload);
                      } catch {
                        /* noop */
                      }
                    }
                    const rowCount = Array.isArray(payload?.rows)
                      ? payload.rows.length
                      : "—";
                    return (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 pr-3">
                          {ts ? new Date(ts).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 pr-3">{s.site}</td>
                        <td className="py-2 pr-3">{s.source}</td>
                        <td className="py-2 pr-3">{s.label || "—"}</td>
                        <td className="py-2 pr-3">{rowCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-text border border-dashed border-gray-300 rounded-md p-6 text-center">
      {children}
    </div>
  );
}
