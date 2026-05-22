"use client";

interface ClearAllButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function ClearAllButton({ onClick, disabled }: ClearAllButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-text"
    >
      Clear All
    </button>
  );
}
