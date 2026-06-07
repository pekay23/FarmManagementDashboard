"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Map, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Field, inputClassName } from "@/components/ui/Field";

type ScoutingRecord = {
  id: string;
  crop_id?: string | null;
  field_name: string;
  scout_date: string;
  crop_stage?: string | null;
  issue_type: string;
  severity: "low" | "medium" | "high" | "critical";
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  recommendation?: string | null;
  status: "open" | "monitoring" | "resolved";
};

const severityClass: Record<ScoutingRecord["severity"], string> = {
  low: "bg-success-soft text-success-fg border-success/20",
  medium: "bg-warning-soft text-warning-fg border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  critical: "bg-destructive text-destructive-foreground border-destructive",
};

export default function ScoutingPage() {
  const [records, setRecords] = useState<ScoutingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRecords() {
    const response = await fetch("/api/scouting", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load scouting records.");
    setRecords(await response.json());
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadRecords()
        .catch((err) => setError(err instanceof Error ? err.message : "Unable to load scouting records."))
        .finally(() => setLoading(false));
    });
  }, []);

  const openIssues = useMemo(() => records.filter((record) => record.status !== "resolved").length, [records]);

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch("/api/scouting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Unable to save scouting record.");
      }
      event.currentTarget.reset();
      toast.success("Scouting record saved");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save scouting record.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(record: ScoutingRecord, status: ScoutingRecord["status"]) {
    const response = await fetch("/api/scouting", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...record, status }),
    });
    if (!response.ok) {
      toast.error("Unable to update scouting status");
      return;
    }
    await loadRecords();
  }

  return (
    <div className="space-y-6 p-4 pb-12 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Field intelligence</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Field Scouting</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Log crop pressure, geo-tag observations, and track recommendations through resolution.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:w-72">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-bold text-muted-foreground">Records</p>
            <p className="text-2xl font-extrabold text-foreground">{records.length}</p>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning-soft p-3">
            <p className="text-xs font-bold text-warning-fg">Open</p>
            <p className="text-2xl font-extrabold text-foreground">{openIssues}</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-foreground">New Observation</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitRecord} className="space-y-4">
              <Field label="Field / plot">
                <input name="field_name" required className={inputClassName} placeholder="North block A4" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Scout date">
                  <input name="scout_date" type="date" className={inputClassName} defaultValue={new Date().toISOString().slice(0, 10)} />
                </Field>
                <Field label="Crop stage">
                  <input name="crop_stage" className={inputClassName} placeholder="Flowering" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Issue type">
                  <input name="issue_type" required className={inputClassName} placeholder="Pest pressure" />
                </Field>
                <Field label="Severity">
                  <select name="severity" className={inputClassName} defaultValue="medium">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Latitude">
                  <input name="latitude" type="number" step="0.000001" className={inputClassName} placeholder="5.603717" />
                </Field>
                <Field label="Longitude">
                  <input name="longitude" type="number" step="0.000001" className={inputClassName} placeholder="-0.186964" />
                </Field>
              </div>
              <Field label="Notes">
                <textarea name="notes" className={inputClassName} rows={3} placeholder="Symptoms, affected area, pest count..." />
              </Field>
              <Field label="Recommendation">
                <textarea name="recommendation" className={inputClassName} rows={3} placeholder="Action plan or monitoring instruction" />
              </Field>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save Observation
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Scouting Queue</h2>
              <p className="mt-1 text-xs text-muted-foreground">Prioritize high-severity records and close them when resolved.</p>
            </div>
            <Map className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : records.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No scouting records yet.</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {records.map((record) => (
                  <article key={record.id} className="rounded-lg border border-border bg-surface-raised p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-foreground">{record.field_name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{record.issue_type} · {new Date(record.scout_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${severityClass[record.severity]}`}>
                        {record.severity}
                      </span>
                    </div>
                    {record.notes && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{record.notes}</p>}
                    {(record.latitude || record.longitude) && (
                      <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {record.latitude}, {record.longitude}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["open", "monitoring", "resolved"] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={record.status === status ? "primary" : "secondary"}
                          onClick={() => updateStatus(record, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {openIssues > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/20 bg-warning-soft p-4 text-sm text-warning-fg">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {openIssues} scouting item{openIssues === 1 ? "" : "s"} still need follow-up.
        </div>
      )}
    </div>
  );
}
