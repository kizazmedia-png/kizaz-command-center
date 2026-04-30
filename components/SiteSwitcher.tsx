"use client";

import { useSite } from "./SiteContext";
import { SITES, SiteId } from "@/lib/sites";

export default function SiteSwitcher() {
  const { siteId, setSiteId } = useSite();
  const ids = Object.keys(SITES) as SiteId[];

  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
      {ids.map((id) => {
        const active = siteId === id;
        return (
          <button
            key={id}
            onClick={() => setSiteId(id)}
            className={[
              "px-3 py-1.5 text-sm font-medium rounded-md transition",
              active
                ? "bg-accent text-white shadow-sm"
                : "text-text hover:text-ink",
            ].join(" ")}
          >
            {SITES[id].name}
          </button>
        );
      })}
    </div>
  );
}
