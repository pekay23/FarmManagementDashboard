"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Field, inputClassName } from "@/components/ui/Field";

type Attachment = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  url?: string;
  data_url?: string;
  notes?: string;
  created_at: string;
};

export default function AttachmentsPage() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileData, setFileData] = useState<{ data_url: string; file_name: string; file_type: string; file_size: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAttachments() {
    const response = await fetch("/api/attachments", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load attachments.");
    setAttachments(await response.json());
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadAttachments()
        .catch((err) => setError(err instanceof Error ? err.message : "Unable to load attachments."))
        .finally(() => setLoading(false));
    });
  }, []);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileData(null);
      return;
    }

    if (file.size > 750_000) {
      setError("Use a file smaller than 750 KB for inline storage.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileData({
        data_url: String(reader.result),
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      });
    };
    reader.readAsDataURL(file);
  }

  async function submitAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      entity_type: form.get("entity_type"),
      entity_id: form.get("entity_id"),
      notes: form.get("notes"),
      url: form.get("url"),
      file_name: form.get("file_name") || fileData?.file_name,
      file_type: fileData?.file_type,
      file_size: fileData?.file_size,
      data_url: fileData?.data_url,
    };

    try {
      const response = await fetch("/api/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Unable to save attachment.");
      }
      event.currentTarget.reset();
      setFileData(null);
      toast.success("Attachment saved");
      await loadAttachments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save attachment.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAttachment(id: string) {
    const response = await fetch("/api/attachments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      toast.error("Unable to delete attachment");
      return;
    }
    toast.success("Attachment deleted");
    await loadAttachments();
  }

  return (
    <div className="space-y-6 p-4 pb-12 lg:px-8 lg:py-10">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Records</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Attachments</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Attach receipts, crop photos, scouting evidence, certificates, and field documents to farm records.</p>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-foreground">New Attachment</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitAttachment} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Entity type">
                  <select name="entity_type" className={inputClassName} defaultValue="scouting">
                    <option value="scouting">Scouting</option>
                    <option value="crop">Crop</option>
                    <option value="livestock">Livestock</option>
                    <option value="sale">Sale</option>
                    <option value="expense">Expense</option>
                    <option value="inventory">Inventory</option>
                  </select>
                </Field>
                <Field label="Record ID">
                  <input name="entity_id" required className={inputClassName} placeholder="Record id" />
                </Field>
              </div>
              <Field label="File">
                <input type="file" onChange={handleFile} className={inputClassName} />
              </Field>
              <Field label="External URL" help="Use this when the file already lives in cloud storage.">
                <input name="url" className={inputClassName} placeholder="https://..." />
              </Field>
              <Field label="Display name">
                <input name="file_name" className={inputClassName} placeholder={fileData?.file_name || "Receipt or photo name"} />
              </Field>
              <Field label="Notes">
                <textarea name="notes" rows={3} className={inputClassName} placeholder="Optional context" />
              </Field>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Save Attachment
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Attachment Library</h2>
              <p className="mt-1 text-xs text-muted-foreground">{attachments.length} files indexed</p>
            </div>
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : attachments.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No attachments saved yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {attachments.map((attachment) => (
                  <article key={attachment.id} className="rounded-lg border border-border bg-surface-raised p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-extrabold text-foreground">{attachment.file_name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{attachment.entity_type} #{attachment.entity_id}</p>
                        {attachment.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{attachment.notes}</p>}
                        {(attachment.url || attachment.data_url) && (
                          <a
                            href={attachment.url || attachment.data_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex text-xs font-bold text-primary hover:underline"
                          >
                            Open file
                          </a>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteAttachment(attachment.id)} aria-label="Delete attachment">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
