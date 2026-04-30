"use client";

import SiteSwitcher from "./SiteSwitcher";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8 pb-5 border-b border-gray-200">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-ink">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text mt-1">{subtitle}</p>
        )}
      </div>
      <SiteSwitcher />
    </div>
  );
}
