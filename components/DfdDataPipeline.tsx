"use client";

import { useMemo } from "react";
import {
  PipelineFileSlot,
  PipelineRow,
  PipelineStepStatus,
  useResults,
} from "./ResultsContext";

// ---------- Output schema ----------

const OUTPUT_HEADERS = [
  "post_title",
  "post_content",
  "post_status",
  "post_author",
  "post_type",
  "post_date",
  "post_modified",
  "post_tags",
  "default_category",
  "featured",
  "street",
  "street2",
  "city",
  "state",
  "country",
  "zip",
  "latitude",
  "longitude",
  "phone",
  "email",
  "website",
  "twitter",
  "facebook",
  "video",
  "restaurant_features",
  "description",
  "review_text",
  "special_offers",
  "time_zone",
  "business_hours",
  "claimed",
  "price",
  "neighborhood",
  "image_url",
  "alt_text",
  "image_title",
] as const;

type OutHeader = (typeof OUTPUT_HEADERS)[number];
type Row = Record<OutHeader, string>;

function emptyRow(): Row {
  const r = {} as Row;
  for (const h of OUTPUT_HEADERS) r[h] = "";
  return r;
}

// ---------- Constants ----------

const STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const NOT_DOG_FRIENDLY_PHRASES = [
  "no dogs allowed",
  "no dogs",
  "not dog friendly",
  "not pet friendly",
  "no pets allowed",
  "no pets",
  "dogs not allowed",
  "pets not allowed",
  "do not allow dogs",
  "do not allow pets",
  "dogs are not allowed",
  "pets are not allowed",
  "not allowed to bring dogs",
  "cannot bring dogs",
  "no animals allowed",
  "turned away",
  "asked to leave",
  "refused dog",
  "refused our dog",
  "would not allow",
  "will not allow dogs",
];

const TZ_OFFSET: Record<string, string> = {
  "america/new_york": "-05:00",
  "america/chicago": "-06:00",
  "america/denver": "-07:00",
  "america/los_angeles": "-08:00",
  "america/phoenix": "-07:00",
  "america/anchorage": "-09:00",
  "america/honolulu": "-10:00",
};

const DAY_ABBR: Record<string, string> = {
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
  sunday: "Su",
};

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// ---------- Helpers ----------

function cleanText(input: string): string {
  if (!input || typeof input !== "string") return input || "";
  if (input.startsWith("http")) return input;
  const replacements: [string, string][] = [
    ["Ã‰", "E"],
    ["Ã©", "e"],
    ["Ã±", "n"],
    ["Ã¡", "a"],
    ["Ã­", "i"],
    ["Ã³", "o"],
    ["Ãº", "u"],
    ["Ã ", "a"],
    ["Ã¨", "e"],
    ["Ã¹", "u"],
    ["Ã¢", "a"],
    ["Ãª", "e"],
    ["Ã®", "i"],
    ["Ã´", "o"],
    ["Ã»", "u"],
    ["Ã«", "e"],
    ["Ã¯", "i"],
    ["Ã¶", "o"],
    ["Ã¼", "u"],
    ["Ã€", "A"],
    ["Ã‡", "C"],
    ["Ã§", "c"],
  ];
  let out = input;
  for (const [k, v] of replacements) {
    out = out.split(k).join(v);
  }
  // Strip remaining non-ASCII
  out = out.replace(/[^\x00-\x7F]/g, "");
  return out;
}

function parseCSV(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else if (c === "\r") {
        // skip
      } else {
        cur += c;
      }
    }
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

function csvEscape(s: unknown): string {
  let v = s == null ? "" : String(s);
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    v = '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function buildCSV(rows: Row[]): string {
  const lines = [OUTPUT_HEADERS.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(OUTPUT_HEADERS.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\r\n");
}

function categoryLabel(tags: string): string {
  const t = (tags || "").toLowerCase();
  if (/(bar|brewery|brew|pub|taproom|beer|cocktail|lounge|nightclub)/.test(t)) return "bar";
  if (/(brunch|breakfast|mimosa)/.test(t)) return "brunch spot";
  if (/(cafe|coffee|espresso|bakery|tea house)/.test(t)) return "cafe";
  return "restaurant";
}

function categorySlug(tags: string): string {
  const t = (tags || "").toLowerCase();
  if (/(bar|brewery|brew|pub|taproom|beer|cocktail|lounge|nightclub)/.test(t)) return "bars-breweries";
  if (/(brunch|breakfast|mimosa)/.test(t)) return "brunch-places";
  if (/(cafe|coffee|espresso|bakery|tea house)/.test(t)) return "cafes";
  return "restaurants";
}

function to24Hour(t: string): string {
  const trimmed = t.trim();
  const m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/);
  if (!m) return trimmed;
  let h = parseInt(m[1], 10);
  const min = m[2] || "00";
  const ampm = m[3].toUpperCase();
  if (ampm === "AM") {
    if (h === 12) h = 0;
  } else if (h !== 12) {
    h += 12;
  }
  return `${h.toString().padStart(2, "0")}:${min}`;
}

function parseDayRange(value: string): string {
  if (!value) return "";
  const v = value.trim();
  if (/^closed$/i.test(v)) return "closed";
  const idx = v.indexOf("-");
  if (idx === -1) return v;
  const left = v.slice(0, idx).trim();
  const right = v.slice(idx + 1).trim();
  return `${to24Hour(left)}-${to24Hour(right)}`;
}

function parseWorkingHours(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  const trimmed = raw.trim();
  // Try JSON object first
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj)) {
          out[k.toLowerCase()] = String(v ?? "");
        }
        return out;
      }
    } catch {
      // fall through
    }
  }
  // Pipe-separated "Monday: 9 AM-5 PM | Tuesday: 9 AM-5 PM"
  const parts = trimmed.split("|");
  for (const part of parts) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const day = part.slice(0, colon).trim().toLowerCase();
    const range = part.slice(colon + 1).trim();
    if (day) out[day] = range;
  }
  return out;
}

function tzPretty(tz: string): string {
  const t = (tz || "").trim();
  if (!t) return "";
  const parts = t.split("/");
  if (parts.length !== 2) return t;
  const cap = (s: string) =>
    s
      .split("_")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
      .join("_");
  return `${cap(parts[0])}/${cap(parts[1])}`;
}

function formatBusinessHours(workingHoursRaw: string, timeZoneRaw: string): string {
  const parsed = parseWorkingHours(workingHoursRaw);
  if (Object.keys(parsed).length === 0) return "";
  const days: string[] = [];
  for (const dayKey of DAY_ORDER) {
    const abbr = DAY_ABBR[dayKey];
    const value = parsed[dayKey];
    if (value == null) continue;
    if (/^closed$/i.test(String(value).trim())) {
      days.push(`${abbr} closed`);
    } else {
      const range = parseDayRange(String(value));
      if (range === "closed") days.push(`${abbr} closed`);
      else days.push(`${abbr} ${range}`);
    }
  }
  const tzKey = (timeZoneRaw || "").trim().toLowerCase();
  const offset = TZ_OFFSET[tzKey] || "";
  const tzName = tzPretty(timeZoneRaw || "");
  const tzObj = offset || tzName ? [{ UTC: offset, Timezone: tzName }] : [];
  return `${JSON.stringify(days)},  ${JSON.stringify(tzObj)}`;
}

function stateMatches(rowState: string, selected: string): boolean {
  if (!selected || selected === "all") return true;
  const rs = (rowState || "").trim();
  if (!rs) return false;
  const match = STATES.find((s) => s.code === selected);
  if (!match) return true;
  const lower = rs.toLowerCase();
  return lower === match.name.toLowerCase() || lower === match.code.toLowerCase();
}

// ---------- Component ----------

const TOTAL_STEPS = 5;

export default function DfdDataPipeline() {
  const { dataPipeline, setDataPipeline, cancelStep4Ref } = useResults();
  const {
    outscraper,
    reviewsRaw,
    photosRaw,
    stepStatus,
    working,
    step4Progress,
    selectedState,
  } = dataPipeline;

  const allFilesReady =
    !!outscraper.rows && !!reviewsRaw.rows && !!photosRaw.rows;

  const completedSteps = stepStatus.filter((s) => s.state === "done").length;

  const updateStep = (idx: number, patch: Partial<PipelineStepStatus>) => {
    setDataPipeline((prev) => {
      const next = [...prev.stepStatus];
      next[idx] = { ...next[idx], ...patch };
      return { stepStatus: next };
    });
  };

  const resetStepsAfter = (idx: number) => {
    setDataPipeline((prev) => {
      const next = [...prev.stepStatus];
      for (let i = idx; i < next.length; i++) {
        next[i] = { state: "idle", message: "" };
      }
      return { stepStatus: next };
    });
  };

  type SlotKey = "outscraper" | "reviewsRaw" | "photosRaw";
  const setSlot = (key: SlotKey, slot: PipelineFileSlot) => {
    setDataPipeline({ [key]: slot } as any);
  };

  // ---------- File loading ----------

  const handleFile = async (
    file: File,
    key: SlotKey,
    label: string
  ) => {
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error("Empty CSV");
      setSlot(key, { file, rows, error: "" });
    } catch (e: any) {
      setSlot(key, { file, rows: null, error: e?.message || `Could not parse ${label}` });
    }
    // Any file change invalidates the pipeline.
    setDataPipeline({
      working: [],
      step4Progress: null,
      stepStatus: Array.from({ length: TOTAL_STEPS }, () => ({
        state: "idle" as const,
        message: "",
      })),
    });
  };

  // ---------- Step 1: Convert + Filter Outscraper ----------

  const runStep1 = () => {
    if (!outscraper.rows) return;
    updateStep(0, { state: "running", message: "" });
    try {
      const rows = outscraper.rows;
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (name: string) => header.indexOf(name.toLowerCase());
      const get = (row: string[], name: string): string => {
        const i = idx(name);
        if (i === -1) return "";
        return row[i] ?? "";
      };

      const out: Row[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;
        const name = (get(r, "name") || "").trim();
        if (!name) continue;
        const row = emptyRow();
        row.post_title = cleanText(name);
        row.post_content = "";
        row.post_status = "publish";
        row.post_author = "1";
        row.post_type = "gd_place";
        row.post_date = "";
        row.post_modified = "";
        row.post_tags = cleanText(get(r, "subtypes"));
        row.default_category = "";
        row.featured = "0";
        row.street = cleanText(get(r, "street"));
        row.street2 = "";
        row.city = cleanText(get(r, "city"));
        row.state = (get(r, "state") || "").trim();
        row.country = "United States";
        row.zip = (get(r, "postal_code") || "").trim();
        row.latitude = (get(r, "latitude") || "").trim();
        row.longitude = (get(r, "longitude") || "").trim();
        row.phone = (get(r, "phone") || "").trim();
        row.email = "";
        row.website = "";
        row.twitter = "";
        row.facebook = "";
        row.video = "";
        row.restaurant_features = cleanText(get(r, "about"));
        row.description = cleanText(get(r, "description"));
        row.review_text = "";
        row.special_offers = "";
        row.time_zone = (get(r, "time_zone") || "").trim();
        row.business_hours = (get(r, "working_hours") || "").trim();
        row.claimed = "0";
        row.price = "";
        row.neighborhood = cleanText(get(r, "county"));
        row.image_url = "";
        row.alt_text = "";
        row.image_title = "";
        out.push(row);
      }
      setDataPipeline({ working: out as PipelineRow[] });
      updateStep(0, {
        state: "done",
        message: `${out.length} rows processed`,
      });
      resetStepsAfter(1);
    } catch (e: any) {
      updateStep(0, { state: "error", message: e?.message || "Step 1 failed" });
    }
  };

  // ---------- Step 2: Merge Reviews ----------

  const runStep2 = () => {
    if (!reviewsRaw.rows || stepStatus[0].state !== "done") return;
    updateStep(1, { state: "running", message: "" });
    try {
      const rows = reviewsRaw.rows;
      const startIdx =
        rows[0] && rows[0][0] && rows[0][0].trim().toLowerCase() === "name" ? 1 : 0;
      const reviewMap = new Map<string, string[]>();
      for (let i = startIdx; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const name = (r[0] || "").trim();
        const text = (r[1] || "").trim();
        if (!name || !text) continue;
        const key = name.toLowerCase();
        const existing = reviewMap.get(key) || [];
        existing.push(text);
        reviewMap.set(key, existing);
      }

      let matched = 0;
      const matchedKeys = new Set<string>();
      const updated = (working as Row[]).map((row) => {
        const key = (row.post_title || "").toLowerCase();
        const reviews = reviewMap.get(key);
        if (reviews && reviews.length) {
          matched++;
          matchedKeys.add(key);
          return { ...row, review_text: reviews.join("\n\n") };
        }
        return row;
      });

      // Filter out not-dog-friendly rows
      let removed = 0;
      const filtered = updated.filter((row) => {
        const txt = (row.review_text || "").toLowerCase();
        if (!txt) return true;
        for (const phrase of NOT_DOG_FRIENDLY_PHRASES) {
          if (txt.includes(phrase)) {
            removed++;
            return false;
          }
        }
        return true;
      });

      const reviewKeysCount = reviewMap.size;
      const unmatched = reviewKeysCount - matchedKeys.size;

      setDataPipeline({ working: filtered as PipelineRow[] });
      updateStep(1, {
        state: "done",
        message: `${matched} matched, ${removed} removed (not dog friendly), ${unmatched} unmatched`,
      });
      resetStepsAfter(2);
    } catch (e: any) {
      updateStep(1, { state: "error", message: e?.message || "Step 2 failed" });
    }
  };

  // ---------- Step 3: Match Photos ----------

  const runStep3 = () => {
    if (!photosRaw.rows || stepStatus[1].state !== "done") return;
    updateStep(2, { state: "running", message: "" });
    try {
      const rows = photosRaw.rows;
      const startIdx = rows.length > 0 ? 1 : 0; // skip header
      const photoMap = new Map<string, string>();
      for (let i = startIdx; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const name = (r[1] || "").trim(); // Column B
        const url = (r[7] || "").trim(); // Column H
        if (!name || !url) continue;
        const key = name.toLowerCase();
        if (!photoMap.has(key)) photoMap.set(key, url);
      }

      let matched = 0;
      const matchedKeys = new Set<string>();
      const updated = (working as Row[]).map((row) => {
        const key = (row.post_title || "").toLowerCase();
        const url = photoMap.get(key);
        if (url) {
          matched++;
          matchedKeys.add(key);
          return {
            ...row,
            image_url: url,
            alt_text: `${row.post_title} - dog friendly restaurant`,
            image_title: row.post_title,
          };
        }
        return row;
      });

      const photoKeysCount = photoMap.size;
      const unmatched = photoKeysCount - matchedKeys.size;

      setDataPipeline({ working: updated as PipelineRow[] });
      updateStep(2, {
        state: "done",
        message: `${matched} matched, ${unmatched} unmatched`,
      });
      resetStepsAfter(3);
    } catch (e: any) {
      updateStep(2, { state: "error", message: e?.message || "Step 3 failed" });
    }
  };

  // ---------- Step 4: AI post_content ----------

  const runStep4 = async () => {
    if (stepStatus[2].state !== "done") return;
    updateStep(3, { state: "running", message: "" });
    cancelStep4Ref.current = false;

    const indices: number[] = [];
    (working as Row[]).forEach((row, i) => {
      if (!row.post_content || row.post_content.length <= 50) {
        indices.push(i);
      }
    });

    if (indices.length === 0) {
      updateStep(3, {
        state: "done",
        message: `0 generated, ${working.length} skipped`,
      });
      resetStepsAfter(4);
      return;
    }

    setDataPipeline({ step4Progress: { current: 0, total: indices.length } });

    let generated = 0;
    let skipped = working.length - indices.length;
    let errors = 0;
    const next = [...(working as Row[])];

    for (let n = 0; n < indices.length; n++) {
      if (cancelStep4Ref.current) break;
      const i = indices[n];
      const row = next[i];
      const cat = categoryLabel(row.post_tags);
      const systemPrompt =
        "You are a professional copywriter writing in a casual, relatable voice for people searching for dog-friendly places.";
      const userPrompt = [
        "Write an individual description for this listing. Be descriptive and aim for 350 words of valuable context.",
        "",
        `Business name: ${row.post_title}`,
        `Category: ${cat}`,
        `City: ${row.city}`,
        `State: ${row.state}`,
        `Description: ${row.description}`,
        `Reviews: ${row.review_text}`,
        `Features: ${row.restaurant_features}`,
        "",
        "Rules:",
        `1. In the very first sentence, refer to the place as 'This ${cat}, located in ${row.city}, ${row.state}'`,
        `2. After that, always refer to it as 'this dog friendly ${cat}'`,
        `3. Replace reviewer references with 'people who visit this dog friendly ${cat}' or 'visitors'`,
        "4. Do not mention actual ratings, reviewer names, or copy reviews directly",
        "5. Write in third person, casual, natural, and neutral tone",
        "6. Do not use markdown, headers, or bullet points — plain paragraph text only",
      ].join("\n");

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: systemPrompt,
            user: userPrompt,
            model: "claude-sonnet-4-6",
            feature: "data-pipeline:post-content",
            maxTokens: 1500,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          errors++;
        } else {
          next[i] = { ...next[i], post_content: (data.output || "").trim() };
          generated++;
        }
      } catch {
        errors++;
      }

      setDataPipeline({
        step4Progress: { current: n + 1, total: indices.length },
        working: [...next] as PipelineRow[],
      });

      // Rate-limit delay
      if (n < indices.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setDataPipeline({ step4Progress: null });
    if (cancelStep4Ref.current) {
      updateStep(3, {
        state: "error",
        message: `Cancelled. ${generated} generated, ${skipped} skipped, ${errors} errors.`,
      });
      return;
    }
    updateStep(3, {
      state: "done",
      message: `${generated} generated, ${skipped} skipped${errors ? `, ${errors} errors` : ""}`,
    });
    resetStepsAfter(4);
  };

  const cancelStep4 = () => {
    cancelStep4Ref.current = true;
  };

  // ---------- Step 5: Hours + Categories ----------

  const runStep5 = () => {
    if (stepStatus[3].state !== "done") return;
    updateStep(4, { state: "running", message: "" });
    try {
      const next = (working as Row[]).map((row) => {
        const slug = categorySlug(row.post_tags);
        const formatted = formatBusinessHours(row.business_hours, row.time_zone);
        return {
          ...row,
          default_category: slug,
          business_hours: formatted || row.business_hours,
        };
      });
      setDataPipeline({ working: next as PipelineRow[] });
      updateStep(4, {
        state: "done",
        message: `${next.length} rows processed`,
      });
    } catch (e: any) {
      updateStep(4, { state: "error", message: e?.message || "Step 5 failed" });
    }
  };

  // ---------- Download ----------

  const filteredRows = useMemo(() => {
    const rows = working as Row[];
    if (selectedState === "all") return rows;
    return rows.filter((r) => stateMatches(r.state, selectedState));
  }, [working, selectedState]);

  const downloadCSV = () => {
    if (stepStatus[4].state !== "done") return;
    const csv = buildCSV(filteredRows);
    const today = new Date().toISOString().slice(0, 10);
    const stateSlug =
      selectedState === "all"
        ? "all"
        : (STATES.find((s) => s.code === selectedState)?.name || selectedState)
            .toLowerCase()
            .replace(/\s+/g, "-");
    const filename = `import-ready-${stateSlug}-${today}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-ink">
            Step {Math.min(completedSteps + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
          </h2>
          <span className="text-xs text-text">
            {completedSteps} / {TOTAL_STEPS} complete
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(completedSteps / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* File uploads */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink mb-1">1. Upload CSVs</h2>
        <p className="text-sm text-text mb-4">
          Drop the three Outscraper exports. Files are processed in your
          browser — nothing is uploaded to a server.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <FileUpload
            label="Outscraper Data"
            description="Main business listings export"
            slot={outscraper}
            onSelect={(file) => handleFile(file, "outscraper", "Outscraper Data")}
          />
          <FileUpload
            label="Reviews Raw"
            description="Col A = business name, Col B = review text"
            slot={reviewsRaw}
            onSelect={(file) => handleFile(file, "reviewsRaw", "Reviews Raw")}
          />
          <FileUpload
            label="Photos Raw"
            description="Col B = business name, Col H = photo URL"
            slot={photosRaw}
            onSelect={(file) => handleFile(file, "photosRaw", "Photos Raw")}
          />
        </div>
      </section>

      {/* Steps */}
      <StepCard
        number={1}
        title="Convert + Filter Outscraper Data"
        description="Map Outscraper columns into the GeoDirectory schema and clean garbled characters."
        status={stepStatus[0]}
        canRun={allFilesReady}
        onRun={runStep1}
      />

      <StepCard
        number={2}
        title="Merge Reviews"
        description="Join reviews by business name, then drop rows whose reviews indicate not-dog-friendly."
        status={stepStatus[1]}
        canRun={stepStatus[0].state === "done"}
        onRun={runStep2}
      />

      <StepCard
        number={3}
        title="Match Photos"
        description="Take the first photo URL per business and write image_url, alt_text, and image_title."
        status={stepStatus[2]}
        canRun={stepStatus[1].state === "done"}
        onRun={runStep3}
      />

      <StepCard
        number={4}
        title="Generate post_content (AI)"
        description="Use Claude Sonnet 4.6 to draft a ~350-word description for each row. Sequential with a 500ms delay."
        status={stepStatus[3]}
        canRun={stepStatus[2].state === "done"}
        onRun={runStep4}
        running={stepStatus[3].state === "running"}
        runningExtra={
          step4Progress ? (
            <div className="mt-3 flex items-center gap-3 text-sm text-text">
              <span>
                Processing {step4Progress.current} of {step4Progress.total}...
              </span>
              <button
                onClick={cancelStep4}
                type="button"
                className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : null
        }
      />

      <StepCard
        number={5}
        title="Format Hours + Assign Categories"
        description="Convert working_hours to GeoDirectory format and assign default_category slug."
        status={stepStatus[4]}
        canRun={stepStatus[3].state === "done"}
        onRun={runStep5}
      />

      {/* Download */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink mb-1">Download</h2>
        <p className="text-sm text-text mb-4">
          Optionally filter the export by state, then download the
          import-ready CSV.
        </p>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <label className="text-sm font-medium text-ink">State filter:</label>
          <select
            value={selectedState}
            onChange={(e) => setDataPipeline({ selectedState: e.target.value })}
            disabled={!allFilesReady}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-gray-50"
          >
            <option value="all">All States</option>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-text">
            {allFilesReady && working.length > 0
              ? `${filteredRows.length} of ${working.length} rows will be exported`
              : ""}
          </span>
          <div className="md:ml-auto">
            <button
              type="button"
              onClick={downloadCSV}
              disabled={stepStatus[4].state !== "done"}
              className="bg-accent hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-md transition"
            >
              Download Import Ready CSV
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------- Sub-components ----------

function FileUpload({
  label,
  description,
  slot,
  onSelect,
}: {
  label: string;
  description: string;
  slot: PipelineFileSlot;
  onSelect: (f: File) => void;
}) {
  return (
    <label className="block border border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-accent transition">
      <div className="text-sm font-semibold text-ink">{label}</div>
      <div className="text-xs text-text mt-0.5">{description}</div>
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
      <div className="mt-3 text-xs">
        {slot.error ? (
          <span className="text-red-600">{slot.error}</span>
        ) : slot.file ? (
          <span className="text-green-700">
            ✓ {slot.file.name}
            {slot.rows ? ` — ${Math.max(slot.rows.length - 1, 0)} rows` : ""}
          </span>
        ) : (
          <span className="text-text">Click to choose CSV</span>
        )}
      </div>
    </label>
  );
}

function StepCard({
  number,
  title,
  description,
  status,
  canRun,
  onRun,
  running,
  runningExtra,
}: {
  number: number;
  title: string;
  description: string;
  status: PipelineStepStatus;
  canRun: boolean;
  onRun: () => void;
  running?: boolean;
  runningExtra?: React.ReactNode;
}) {
  const isRunning = running ?? status.state === "running";
  const isDone = status.state === "done";
  const isError = status.state === "error";
  return (
    <section
      className={[
        "bg-white border rounded-xl p-6 shadow-sm",
        !canRun && status.state === "idle"
          ? "border-gray-200 opacity-60"
          : isDone
          ? "border-green-200"
          : isError
          ? "border-red-200"
          : "border-gray-200",
      ].join(" ")}
    >
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Badge state={status.state} number={number} />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <p className="text-sm text-text mt-1">{description}</p>
          </div>
        </div>
        <Pill state={status.state} />
      </header>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun || isRunning}
          className="bg-accent hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-md transition flex items-center gap-2"
        >
          {isRunning && (
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {isRunning
            ? "Running..."
            : isDone
            ? `Re-run Step ${number}`
            : `Run Step ${number}`}
        </button>
        {status.message && (
          <span
            className={[
              "text-sm",
              isError ? "text-red-700" : "text-text",
            ].join(" ")}
          >
            {status.message}
          </span>
        )}
      </div>
      {runningExtra}
    </section>
  );
}

function Badge({
  state,
  number,
}: {
  state: PipelineStepStatus["state"];
  number: number;
}) {
  if (state === "done") {
    return (
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold">
        ✓
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold">
        !
      </div>
    );
  }
  if (state === "running") {
    return (
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-semibold">
        {number}
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-semibold">
      {number}
    </div>
  );
}

function Pill({ state }: { state: PipelineStepStatus["state"] }) {
  if (state === "done") {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
        Complete
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
        Error
      </span>
    );
  }
  if (state === "running") {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/30 whitespace-nowrap">
        Running
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200 whitespace-nowrap">
      Idle
    </span>
  );
}
