"use client";

import PageHeader from "@/components/PageHeader";
import ClearAllButton from "@/components/ClearAllButton";
import DfdDataPipeline from "@/components/DfdDataPipeline";
import { useSite } from "@/components/SiteContext";
import { useResults } from "@/components/ResultsContext";

export default function DataPipelinePage() {
  const { siteId } = useSite();
  const { clearDataPipelineResults } = useResults();

  if (siteId !== "dfd") {
    return (
      <div>
        <PageHeader
          title="Data Pipeline"
          subtitle="Available for Dog Friendly Destos."
        />
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center text-text">
          Switch the active site to <strong>Dog Friendly Destos</strong> to use
          the Data Pipeline.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="DFD Data Pipeline"
        subtitle="Upload Outscraper, Reviews, and Photos CSVs → run 5 steps → download an import-ready CSV."
        actions={<ClearAllButton onClick={clearDataPipelineResults} />}
      />
      <DfdDataPipeline />
    </div>
  );
}
