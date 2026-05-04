"use client";

import { useState, ReactNode } from "react";
import { useSite } from "./SiteContext";
import MarkdownView from "./MarkdownView";
import { ToolId } from "@/lib/prompts";

export type FieldType = "text" | "textarea" | "select" | "checkboxes" | "number";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[]; // for select / checkboxes
  rows?: number; // for textarea
  required?: boolean;
  helper?: string;
}

export interface WordPressPost {
  id: number;
  title: string;
  slug: string;
  status: string;
  date: string;
  excerpt: string;
  link: string;
}

export interface WordPressLoader {
  /** Which textarea field name to populate. */
  field: string;
  /** Button label. */
  label: string;
  /** Convert a post into the text representation appended (one per line). */
  format: (post: WordPressPost) => string;
}

export interface PublishToWordPress {
  /** Which input field to use as the post title. */
  titleField: string;
  /** Optional override label for the button. */
  label?: string;
}

interface ToolCardProps {
  tool: ToolId;
  title: string;
  description?: string;
  fields: FieldDef[];
  submitLabel?: string;
  /** If true, hide the card entirely (used for site-specific tools). */
  hidden?: boolean;
  /** Buttons that load post data from the active site's WordPress and populate a textarea. */
  wordPressLoaders?: WordPressLoader[];
  /** Show a "Send to WordPress as Draft" button after a successful generation. */
  publishToWordPress?: PublishToWordPress;
}

export default function ToolCard({
  tool,
  title,
  description,
  fields,
  submitLabel = "Generate",
  hidden,
  wordPressLoaders,
  publishToWordPress,
}: ToolCardProps) {
  const { siteId } = useSite();
  const [values, setValues] = useState<Record<string, any>>({});
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loadingLoader, setLoadingLoader] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{
    kind: "ok" | "err";
    text: string;
    url?: string;
  } | null>(null);

  if (hidden) return null;

  const update = (name: string, value: any) =>
    setValues((v) => ({ ...v, [name]: value }));

  const submit = async () => {
    // Validate required
    for (const f of fields) {
      if (f.required) {
        const v = values[f.name];
        if (
          v === undefined ||
          v === null ||
          (typeof v === "string" && !v.trim()) ||
          (Array.isArray(v) && v.length === 0)
        ) {
          setError(`Please fill in: ${f.label}`);
          return;
        }
      }
    }
    setError("");
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, inputs: values, site: siteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || `Request failed (${res.status})`);
      } else {
        setOutput(data.output || "");
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setOutput("");
    setError("");
    setCopied(false);
    setPublishMsg(null);
  };

  const runLoader = async (loader: WordPressLoader) => {
    setLoadingLoader(loader.field);
    setError("");
    try {
      const res = await fetch("/api/wordpress/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: siteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || `WordPress request failed (${res.status})`);
        return;
      }
      const posts: WordPressPost[] = Array.isArray(data?.posts)
        ? data.posts
        : [];
      const text = posts.map(loader.format).filter(Boolean).join("\n");
      const existing = (values[loader.field] || "").trim();
      const next = existing ? `${existing}\n${text}` : text;
      update(loader.field, next);
    } catch (e: any) {
      setError(e?.message || "Network error loading WordPress posts");
    } finally {
      setLoadingLoader("");
    }
  };

  const sendToWordPress = async () => {
    if (!publishToWordPress || !output) return;
    const titleSrc = values[publishToWordPress.titleField];
    const title =
      typeof titleSrc === "string" && titleSrc.trim()
        ? titleSrc.trim()
        : "Untitled draft";
    setPublishing(true);
    setPublishMsg(null);
    try {
      const res = await fetch("/api/wordpress/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: siteId,
          title,
          content: output,
          status: "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPublishMsg({
          kind: "err",
          text: data?.error || `WordPress request failed (${res.status})`,
        });
      } else {
        setPublishMsg({
          kind: "ok",
          text: "Draft created in WordPress.",
          url: data?.editUrl || data?.url || "",
        });
      }
    } catch (e: any) {
      setPublishMsg({
        kind: "err",
        text: e?.message || "Network error sending to WordPress",
      });
    } finally {
      setPublishing(false);
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description && (
          <p className="text-sm text-text mt-1">{description}</p>
        )}
      </header>

      {wordPressLoaders && wordPressLoaders.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {wordPressLoaders.map((loader) => {
            const isLoading = loadingLoader === loader.field;
            return (
              <button
                key={loader.field + loader.label}
                type="button"
                onClick={() => runLoader(loader)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-text disabled:opacity-60 flex items-center gap-2"
              >
                {isLoading && <Spinner small dark />}
                {isLoading ? "Loading..." : loader.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        {fields.map((f) => (
          <Field
            key={f.name}
            field={f}
            value={values[f.name]}
            onChange={(v) => update(f.name, v)}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={loading}
          className="bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-md transition flex items-center gap-2"
        >
          {loading && <Spinner />}
          {loading ? "Generating..." : submitLabel}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {output && (
        <div className="mt-6 border-t border-gray-200 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">Output</h3>
            <div className="flex items-center gap-2">
              {publishToWordPress && (
                <button
                  onClick={sendToWordPress}
                  disabled={publishing}
                  className="text-xs px-3 py-1.5 rounded-md bg-accent hover:bg-accent/90 disabled:opacity-60 text-white flex items-center gap-2"
                >
                  {publishing && <Spinner small />}
                  {publishing
                    ? "Sending..."
                    : publishToWordPress.label || "Send to WordPress as Draft"}
                </button>
              )}
              <button
                onClick={copy}
                className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-text"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={clear}
                className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-text"
              >
                Clear
              </button>
            </div>
          </div>
          {publishMsg && (
            <div
              className={[
                "mb-3 p-3 rounded-md border text-sm",
                publishMsg.kind === "ok"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-700",
              ].join(" ")}
            >
              {publishMsg.text}
              {publishMsg.url && (
                <>
                  {" "}
                  <a
                    href={publishMsg.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Open in WordPress →
                  </a>
                </>
              )}
            </div>
          )}
          <MarkdownView content={output} />
        </div>
      )}
    </section>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  const labelEl = (
    <label className="block text-sm font-medium text-ink mb-1.5">
      {field.label}
      {field.required && <span className="text-accent ml-1">*</span>}
    </label>
  );

  const helper = field.helper && (
    <p className="text-xs text-text mt-1">{field.helper}</p>
  );

  if (field.type === "textarea") {
    return (
      <div>
        {labelEl}
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows || 4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        />
        {helper}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        {labelEl}
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        >
          <option value="" disabled>
            Choose...
          </option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {helper}
      </div>
    );
  }

  if (field.type === "checkboxes") {
    const arr: string[] = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      onChange(arr.includes(opt) ? arr.filter((o) => o !== opt) : [...arr, opt]);
    };
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-3">
          {field.options?.map((opt) => {
            const on = arr.includes(opt);
            return (
              <label
                key={opt}
                className={[
                  "px-3 py-1.5 rounded-md border text-sm cursor-pointer transition",
                  on
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-white border-gray-300 text-text hover:border-gray-400",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(opt)}
                  className="sr-only"
                />
                {opt}
              </label>
            );
          })}
        </div>
        {helper}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        {labelEl}
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        />
        {helper}
      </div>
    );
  }

  return (
    <div>
      {labelEl}
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
      />
      {helper}
    </div>
  );
}

function Spinner({ small, dark }: { small?: boolean; dark?: boolean }) {
  const size = small ? "w-3 h-3" : "w-4 h-4";
  const color = dark
    ? "border-gray-300 border-t-gray-700"
    : "border-white/40 border-t-white";
  return (
    <span
      className={`inline-block ${size} border-2 ${color} rounded-full animate-spin`}
    />
  );
}

export function ToolGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{children}</div>;
}
