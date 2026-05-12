"use client";

import { useMemo, useState } from "react";
import { useSite } from "./SiteContext";
import MarkdownView from "./MarkdownView";
import { ToolId } from "@/lib/prompts";

type StepKey =
  | "intent"
  | "keywords"
  | "brief"
  | "draft"
  | "meta";

interface StepDef {
  key: StepKey;
  number: number;
  title: string;
  description: string;
  buttonLabel: string;
  tool: ToolId;
  outputKey:
    | "intentAnalysis"
    | "approvedKeywords"
    | "contentBrief"
    | "articleDraft"
    | "metaDescription";
}

const STEPS: StepDef[] = [
  {
    key: "intent",
    number: 1,
    title: "Reader Intent Analysis",
    description: "Identify primary intent, reader questions, and winning angle.",
    buttonLabel: "Analyze Intent",
    tool: "dfd-intent",
    outputKey: "intentAnalysis",
  },
  {
    key: "keywords",
    number: 2,
    title: "LSI Keyword Intake",
    description: "Review and flag keyword artifacts before brief generation.",
    buttonLabel: "Review Keywords",
    tool: "dfd-keywords",
    outputKey: "approvedKeywords",
  },
  {
    key: "brief",
    number: 3,
    title: "Content Brief",
    description: "Combine intent + keywords into a full content brief.",
    buttonLabel: "Build Brief",
    tool: "dfd-brief",
    outputKey: "contentBrief",
  },
  {
    key: "draft",
    number: 4,
    title: "Full Article Draft",
    description: "Write the complete article from the brief.",
    buttonLabel: "Draft Article",
    tool: "dfd-draft",
    outputKey: "articleDraft",
  },
  {
    key: "meta",
    number: 5,
    title: "Meta Description",
    description: "Write a meta description tuned to the final article.",
    buttonLabel: "Write Meta Description",
    tool: "dfd-meta",
    outputKey: "metaDescription",
  },
];

interface Outputs {
  intentAnalysis: string;
  approvedKeywords: string;
  contentBrief: string;
  articleDraft: string;
  metaDescription: string;
}

const EMPTY_OUTPUTS: Outputs = {
  intentAnalysis: "",
  approvedKeywords: "",
  contentBrief: "",
  articleDraft: "",
  metaDescription: "",
};

export default function DfdArticleWorkflow() {
  const { siteId } = useSite();

  // Step inputs
  const [targetKeyword, setTargetKeyword] = useState("");
  const [keywordsKeyword, setKeywordsKeyword] = useState("");
  const [lsiTable, setLsiTable] = useState("");
  const [briefKeyword, setBriefKeyword] = useState("");
  const [readingLevel, setReadingLevel] = useState(
    "10th Grade Flesch-Kincaid"
  );
  const [ctaDestination, setCtaDestination] = useState("");

  // Step outputs
  const [outputs, setOutputs] = useState<Outputs>(EMPTY_OUTPUTS);

  // Per-step UI state
  const [loadingStep, setLoadingStep] = useState<StepKey | "">("");
  const [errorStep, setErrorStep] = useState<{ step: StepKey; msg: string } | null>(
    null
  );
  const [collapsed, setCollapsed] = useState<Record<StepKey, boolean>>({
    intent: false,
    keywords: false,
    brief: false,
    draft: false,
    meta: false,
  });
  const [copiedStep, setCopiedStep] = useState<StepKey | "">("");

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{
    kind: "ok" | "err";
    text: string;
    url?: string;
  } | null>(null);

  const stepStatus = (key: StepKey): "complete" | "ready" | "locked" => {
    const idx = STEPS.findIndex((s) => s.key === key);
    const prev = idx > 0 ? STEPS[idx - 1] : null;
    const out = outputs[STEPS[idx].outputKey];
    if (out) return "complete";
    if (!prev) return "ready";
    return outputs[prev.outputKey] ? "ready" : "locked";
  };

  const completedCount = useMemo(
    () => STEPS.filter((s) => outputs[s.outputKey]).length,
    [outputs]
  );

  const buildInputs = (key: StepKey): Record<string, any> => {
    switch (key) {
      case "intent":
        return { keyword: targetKeyword };
      case "keywords":
        return { keyword: keywordsKeyword || targetKeyword, lsi: lsiTable };
      case "brief":
        return {
          keyword: briefKeyword || targetKeyword,
          intentAnalysis: outputs.intentAnalysis,
          approvedKeywords: outputs.approvedKeywords,
        };
      case "draft":
        return {
          contentBrief: outputs.contentBrief,
          readingLevel,
          ctaDestination,
        };
      case "meta":
        return { articleDraft: outputs.articleDraft };
      default:
        return {};
    }
  };

  const validateStep = (key: StepKey): string => {
    switch (key) {
      case "intent":
        if (!targetKeyword.trim()) return "Please enter a target keyword.";
        return "";
      case "keywords":
        if (!(keywordsKeyword.trim() || targetKeyword.trim()))
          return "Please enter the main keyword.";
        if (!lsiTable.trim()) return "Please paste the LSI keyword table.";
        return "";
      case "brief":
        if (!(briefKeyword.trim() || targetKeyword.trim()))
          return "Please enter the target keyword.";
        return "";
      case "draft":
        if (!ctaDestination.trim())
          return "Please enter where the CTA points to.";
        return "";
      default:
        return "";
    }
  };

  const runStep = async (step: StepDef) => {
    const validation = validateStep(step.key);
    if (validation) {
      setErrorStep({ step: step.key, msg: validation });
      return;
    }
    setErrorStep(null);
    setLoadingStep(step.key);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: step.tool,
          inputs: buildInputs(step.key),
          site: siteId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorStep({
          step: step.key,
          msg: data?.error || `Request failed (${res.status})`,
        });
      } else {
        const text: string = data.output || "";
        setOutputs((o) => ({ ...o, [step.outputKey]: text }));

        // Pre-fill subsequent step inputs from completed step
        if (step.key === "intent" && !keywordsKeyword.trim()) {
          setKeywordsKeyword(targetKeyword);
        }
        if (step.key === "keywords" && !briefKeyword.trim()) {
          setBriefKeyword(keywordsKeyword || targetKeyword);
        }

        // Collapse this step, expand the next one
        setCollapsed((c) => {
          const next = { ...c, [step.key]: true };
          const idx = STEPS.findIndex((s) => s.key === step.key);
          const nextStep = STEPS[idx + 1];
          if (nextStep) next[nextStep.key] = false;
          return next;
        });
      }
    } catch (e: any) {
      setErrorStep({
        step: step.key,
        msg: e?.message || "Network error",
      });
    } finally {
      setLoadingStep("");
    }
  };

  const copyOutput = async (key: StepKey, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStep(key);
      setTimeout(() => setCopiedStep(""), 1500);
    } catch {
      /* noop */
    }
  };

  const clearOutput = (step: StepDef) => {
    setOutputs((o) => ({ ...o, [step.outputKey]: "" }));
    setCollapsed((c) => ({ ...c, [step.key]: false }));
  };

  const sendToWordPress = async () => {
    if (!outputs.articleDraft) return;
    setPublishing(true);
    setPublishMsg(null);
    try {
      const title =
        (briefKeyword || targetKeyword || "Untitled draft").trim() ||
        "Untitled draft";
      const res = await fetch("/api/wordpress/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: siteId,
          title,
          content: outputs.articleDraft,
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

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-ink">
            Step {Math.min(completedCount + 1, STEPS.length)} of {STEPS.length}
          </h2>
          <span className="text-xs text-text">
            {completedCount} / {STEPS.length} complete
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{
              width: `${(completedCount / STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {STEPS.map((step) => {
        const status = stepStatus(step.key);
        const out = outputs[step.outputKey];
        const isLoading = loadingStep === step.key;
        const isLocked = status === "locked";
        const err =
          errorStep && errorStep.step === step.key ? errorStep.msg : "";

        return (
          <section
            key={step.key}
            className={[
              "bg-white border rounded-xl p-6 shadow-sm transition",
              isLocked
                ? "border-gray-200 opacity-60"
                : status === "complete"
                ? "border-green-200"
                : "border-gray-200",
            ].join(" ")}
          >
            <header className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <StatusBadge status={status} number={step.number} />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-ink">
                    {step.title}
                  </h2>
                  <p className="text-sm text-text mt-1">{step.description}</p>
                </div>
              </div>
              <StatusPill status={status} />
            </header>

            {/* Step inputs */}
            <fieldset disabled={isLocked} className="space-y-4">
              {step.key === "intent" && (
                <TextField
                  label="Target Keyword"
                  required
                  value={targetKeyword}
                  onChange={setTargetKeyword}
                  placeholder="e.g. dog friendly patios austin"
                />
              )}

              {step.key === "keywords" && (
                <>
                  <TextField
                    label="Main Keyword"
                    required
                    value={keywordsKeyword}
                    onChange={setKeywordsKeyword}
                    placeholder="Pre-filled from Step 1"
                  />
                  <TextAreaField
                    label="LSI Keywords (paste table with mention counts)"
                    required
                    value={lsiTable}
                    onChange={setLsiTable}
                    rows={8}
                    placeholder={"keyword\tmentions\ndog patio\t12\n..."}
                  />
                </>
              )}

              {step.key === "brief" && (
                <>
                  <ReadOnlyContext
                    label="Reader Intent Analysis (from Step 1)"
                    value={outputs.intentAnalysis}
                  />
                  <ReadOnlyContext
                    label="Approved Keyword List (from Step 2)"
                    value={outputs.approvedKeywords}
                  />
                  <TextField
                    label="Target Keyword"
                    required
                    value={briefKeyword}
                    onChange={setBriefKeyword}
                    placeholder="Pre-filled from Step 1"
                  />
                </>
              )}

              {step.key === "draft" && (
                <>
                  <ReadOnlyContext
                    label="Content Brief (from Step 3)"
                    value={outputs.contentBrief}
                  />
                  <TextField
                    label="Reading Level"
                    value={readingLevel}
                    onChange={setReadingLevel}
                  />
                  <TextField
                    label="CTA points to (URL or page name)"
                    required
                    value={ctaDestination}
                    onChange={setCtaDestination}
                    placeholder="e.g. https://dogfriendlydestos.com/austin"
                  />
                </>
              )}

              {step.key === "meta" && (
                <ReadOnlyContext
                  label="Article Draft (from Step 4)"
                  value={outputs.articleDraft}
                />
              )}
            </fieldset>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => runStep(step)}
                disabled={isLocked || isLoading}
                className="bg-accent hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-md transition flex items-center gap-2"
              >
                {isLoading && <Spinner />}
                {isLoading
                  ? "Working..."
                  : out
                  ? `Re-run: ${step.buttonLabel}`
                  : step.buttonLabel}
              </button>
            </div>

            {err && (
              <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                {err}
              </div>
            )}

            {out && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [step.key]: !c[step.key] }))
                    }
                    className="text-sm font-semibold text-ink flex items-center gap-2"
                  >
                    <span
                      className={[
                        "inline-block w-2 h-2 border-r-2 border-b-2 border-text transition-transform",
                        collapsed[step.key]
                          ? "-rotate-45"
                          : "rotate-45",
                      ].join(" ")}
                    />
                    Output
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyOutput(step.key, out)}
                      className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-text"
                    >
                      {copiedStep === step.key ? "Copied!" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => clearOutput(step)}
                      className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-text"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {!collapsed[step.key] && <MarkdownView content={out} />}
              </div>
            )}
          </section>
        );
      })}

      {/* WordPress publish */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-ink">Publish</h2>
          <p className="text-sm text-text mt-1">
            Send the article draft (Step 4 output) to the active WordPress site as
            a draft.
          </p>
        </header>
        <button
          type="button"
          onClick={sendToWordPress}
          disabled={!outputs.articleDraft || publishing}
          className="bg-accent hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-md transition flex items-center gap-2"
        >
          {publishing && <Spinner />}
          {publishing ? "Sending..." : "Send to WordPress as Draft"}
        </button>
        {publishMsg && (
          <div
            className={[
              "mt-4 p-3 rounded-md border text-sm",
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
      </section>
    </div>
  );
}

function StatusBadge({
  status,
  number,
}: {
  status: "complete" | "ready" | "locked";
  number: number;
}) {
  if (status === "complete") {
    return (
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">
        ✓
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-semibold">
        {number}
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-semibold">
      {number}
    </div>
  );
}

function StatusPill({ status }: { status: "complete" | "ready" | "locked" }) {
  if (status === "complete") {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
        Complete
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 whitespace-nowrap">
        Ready
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200 whitespace-nowrap">
      Not Started
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-gray-50"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows || 4}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-gray-50"
      />
    </div>
  );
}

function ReadOnlyContext({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}
      </label>
      <div className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-xs text-text max-h-40 overflow-y-auto whitespace-pre-wrap">
        {value || (
          <span className="italic text-gray-400">
            No output yet — complete the previous step.
          </span>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
  );
}
