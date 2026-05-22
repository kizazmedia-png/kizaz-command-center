"use client";

import {
  createContext,
  MutableRefObject,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { ToolId } from "@/lib/prompts";

// ---------------- Tool card slice ----------------

export interface ToolPublishMsg {
  kind: "ok" | "err";
  text: string;
  url?: string;
}

export interface ToolState {
  values: Record<string, any>;
  output: string;
  error: string;
  loading: boolean;
  loadingLoader: string;
  publishing: boolean;
  publishMsg: ToolPublishMsg | null;
}

const DEFAULT_TOOL_STATE: ToolState = {
  values: {},
  output: "",
  error: "",
  loading: false,
  loadingLoader: "",
  publishing: false,
  publishMsg: null,
};

// ---------------- DFD article workflow slice ----------------

export type DfdStepKey = "intent" | "keywords" | "brief" | "draft" | "meta";

export type DfdOutputKey =
  | "intentAnalysis"
  | "approvedKeywords"
  | "contentBrief"
  | "articleDraft"
  | "metaDescription";

export interface DfdOutputs {
  intentAnalysis: string;
  approvedKeywords: string;
  contentBrief: string;
  articleDraft: string;
  metaDescription: string;
}

export interface DfdWorkflowState {
  targetKeyword: string;
  keywordsKeyword: string;
  lsiTable: string;
  briefKeyword: string;
  readingLevel: string;
  ctaDestination: string;
  outputs: DfdOutputs;
  loadingStep: DfdStepKey | "";
  errorStep: { step: DfdStepKey; msg: string } | null;
  collapsed: Record<DfdStepKey, boolean>;
  publishing: boolean;
  publishMsg: ToolPublishMsg | null;
}

const EMPTY_DFD_OUTPUTS: DfdOutputs = {
  intentAnalysis: "",
  approvedKeywords: "",
  contentBrief: "",
  articleDraft: "",
  metaDescription: "",
};

const DEFAULT_DFD_WORKFLOW: DfdWorkflowState = {
  targetKeyword: "",
  keywordsKeyword: "",
  lsiTable: "",
  briefKeyword: "",
  readingLevel: "10th Grade Flesch-Kincaid",
  ctaDestination: "",
  outputs: EMPTY_DFD_OUTPUTS,
  loadingStep: "",
  errorStep: null,
  collapsed: {
    intent: false,
    keywords: false,
    brief: false,
    draft: false,
    meta: false,
  },
  publishing: false,
  publishMsg: null,
};

// ---------------- DFD data pipeline slice ----------------

export interface PipelineFileSlot {
  file: File | null;
  rows: string[][] | null;
  error: string;
}

export interface PipelineStepStatus {
  state: "idle" | "running" | "done" | "error";
  message: string;
}

export type PipelineRow = Record<string, string>;

const TOTAL_PIPELINE_STEPS = 5;

export interface DataPipelineState {
  outscraper: PipelineFileSlot;
  reviewsRaw: PipelineFileSlot;
  photosRaw: PipelineFileSlot;
  stepStatus: PipelineStepStatus[];
  working: PipelineRow[];
  step4Progress: { current: number; total: number } | null;
  selectedState: string;
}

const EMPTY_FILE_SLOT: PipelineFileSlot = {
  file: null,
  rows: null,
  error: "",
};

const DEFAULT_PIPELINE_STATE: DataPipelineState = {
  outscraper: EMPTY_FILE_SLOT,
  reviewsRaw: EMPTY_FILE_SLOT,
  photosRaw: EMPTY_FILE_SLOT,
  stepStatus: Array.from({ length: TOTAL_PIPELINE_STEPS }, () => ({
    state: "idle" as const,
    message: "",
  })),
  working: [],
  step4Progress: null,
  selectedState: "all",
};

// ---------------- Data page slice ----------------

export type DataTimeFilter = "today" | "7d" | "30d" | "custom";

export interface GscRow {
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

export interface Ga4Row {
  pagePath: string;
  pageTitle: string;
  views: number;
  sessions: number;
  bounceRate: number;
}

export interface SnapshotRow {
  captured_at: string | { value: string };
  site: string;
  source: string;
  label: string | null;
  payload: any;
}

export interface AnthropicUsage {
  configured: boolean;
  error?: string;
  empty?: boolean;
  range?: { startDate: string; endDate: string };
  totalUsd?: number;
  byModel?: { model: string; usd: number }[];
  byFeature?: { feature: string; usd: number }[];
  byTokenType?: { tokenType: string; usd: number }[];
  daily?: { date: string; usd: number }[];
  tokens?: {
    input: number;
    output: number;
    cache_read: number;
    cache_creation: number;
  };
}

export interface DataPageState {
  filter: DataTimeFilter;
  customStart: string;
  customEnd: string;
  gscMode: "topPages" | "declining";
  gscRows: GscRow[];
  gscLoading: boolean;
  gscError: string;
  gscLoaded: boolean;
  ga4Rows: Ga4Row[];
  ga4Loading: boolean;
  ga4Error: string;
  ga4Loaded: boolean;
  snapshots: SnapshotRow[];
  bqLoading: boolean;
  bqError: string;
  bqStatus: string;
  bqLoaded: boolean;
  anthropicUsage: AnthropicUsage | null;
  anthropicLoading: boolean;
  anthropicError: string;
  anthropicLoaded: boolean;
}

const DEFAULT_DATA_PAGE_STATE: DataPageState = {
  filter: "today",
  customStart: "",
  customEnd: "",
  gscMode: "topPages",
  gscRows: [],
  gscLoading: false,
  gscError: "",
  gscLoaded: false,
  ga4Rows: [],
  ga4Loading: false,
  ga4Error: "",
  ga4Loaded: false,
  snapshots: [],
  bqLoading: false,
  bqError: "",
  bqStatus: "",
  bqLoaded: false,
  anthropicUsage: null,
  anthropicLoading: false,
  anthropicError: "",
  anthropicLoaded: false,
};

// ---------------- Context shape ----------------

type Updater<T> = Partial<T> | ((prev: T) => Partial<T>);

interface ResultsContextValue {
  // Tool slice
  toolStates: Record<string, ToolState>;
  setToolState: (tool: ToolId, updater: Updater<ToolState>) => void;
  clearToolResults: (toolIds: ToolId[]) => void;

  // DFD workflow slice
  dfdWorkflow: DfdWorkflowState;
  setDfdWorkflow: (updater: Updater<DfdWorkflowState>) => void;
  clearDfdWorkflowResults: () => void;

  // Data pipeline slice
  dataPipeline: DataPipelineState;
  setDataPipeline: (updater: Updater<DataPipelineState>) => void;
  cancelStep4Ref: MutableRefObject<boolean>;
  clearDataPipelineResults: () => void;

  // Data page slice
  dataPage: DataPageState;
  setDataPage: (updater: Updater<DataPageState>) => void;
  clearDataPageResults: () => void;
}

const Ctx = createContext<ResultsContextValue | null>(null);

function applyUpdater<T>(prev: T, updater: Updater<T>): T {
  const patch = typeof updater === "function" ? updater(prev) : updater;
  return { ...prev, ...patch };
}

export function ResultsProvider({ children }: { children: ReactNode }) {
  const [toolStates, setToolStatesRaw] = useState<Record<string, ToolState>>(
    {}
  );
  const [dfdWorkflow, setDfdWorkflowRaw] =
    useState<DfdWorkflowState>(DEFAULT_DFD_WORKFLOW);
  const [dataPipeline, setDataPipelineRaw] = useState<DataPipelineState>(
    DEFAULT_PIPELINE_STATE
  );
  const [dataPage, setDataPageRaw] = useState<DataPageState>(
    DEFAULT_DATA_PAGE_STATE
  );
  const cancelStep4Ref = useRef(false);

  const setToolState = useCallback(
    (tool: ToolId, updater: Updater<ToolState>) => {
      setToolStatesRaw((prev) => {
        const current = prev[tool] || DEFAULT_TOOL_STATE;
        const next = applyUpdater(current, updater);
        return { ...prev, [tool]: next };
      });
    },
    []
  );

  const clearToolResults = useCallback((toolIds: ToolId[]) => {
    setToolStatesRaw((prev) => {
      const next = { ...prev };
      for (const id of toolIds) {
        const current = next[id];
        if (!current) continue;
        next[id] = {
          ...current,
          output: "",
          error: "",
          publishMsg: null,
        };
      }
      return next;
    });
  }, []);

  const setDfdWorkflow = useCallback((updater: Updater<DfdWorkflowState>) => {
    setDfdWorkflowRaw((prev) => applyUpdater(prev, updater));
  }, []);

  const clearDfdWorkflowResults = useCallback(() => {
    setDfdWorkflowRaw((prev) => ({
      ...prev,
      outputs: EMPTY_DFD_OUTPUTS,
      errorStep: null,
      publishMsg: null,
      collapsed: {
        intent: false,
        keywords: false,
        brief: false,
        draft: false,
        meta: false,
      },
    }));
  }, []);

  const setDataPipeline = useCallback((updater: Updater<DataPipelineState>) => {
    setDataPipelineRaw((prev) => applyUpdater(prev, updater));
  }, []);

  const clearDataPipelineResults = useCallback(() => {
    setDataPipelineRaw((prev) => ({
      ...prev,
      working: [],
      stepStatus: Array.from({ length: TOTAL_PIPELINE_STEPS }, () => ({
        state: "idle" as const,
        message: "",
      })),
      step4Progress: null,
    }));
    cancelStep4Ref.current = true;
  }, []);

  const setDataPage = useCallback((updater: Updater<DataPageState>) => {
    setDataPageRaw((prev) => applyUpdater(prev, updater));
  }, []);

  const clearDataPageResults = useCallback(() => {
    setDataPageRaw((prev) => ({
      ...prev,
      gscRows: [],
      gscError: "",
      gscLoaded: false,
      ga4Rows: [],
      ga4Error: "",
      ga4Loaded: false,
      snapshots: [],
      bqError: "",
      bqStatus: "",
      bqLoaded: false,
      anthropicUsage: null,
      anthropicError: "",
      anthropicLoaded: false,
    }));
  }, []);

  const value = useMemo<ResultsContextValue>(
    () => ({
      toolStates,
      setToolState,
      clearToolResults,
      dfdWorkflow,
      setDfdWorkflow,
      clearDfdWorkflowResults,
      dataPipeline,
      setDataPipeline,
      cancelStep4Ref,
      clearDataPipelineResults,
      dataPage,
      setDataPage,
      clearDataPageResults,
    }),
    [
      toolStates,
      setToolState,
      clearToolResults,
      dfdWorkflow,
      setDfdWorkflow,
      clearDfdWorkflowResults,
      dataPipeline,
      setDataPipeline,
      clearDataPipelineResults,
      dataPage,
      setDataPage,
      clearDataPageResults,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResults() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useResults must be used inside <ResultsProvider>");
  return v;
}

export function useToolResults(tool: ToolId) {
  const { toolStates, setToolState } = useResults();
  const state = toolStates[tool] || DEFAULT_TOOL_STATE;
  return {
    state,
    update: (updater: Updater<ToolState>) => setToolState(tool, updater),
  };
}
