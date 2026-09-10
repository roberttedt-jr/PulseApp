import React from "react";
import { SPORTS_CATALOG, type SportMeta } from "@/lib/pulse/sports";
import { HScroll } from "@/components/pulse/h-scroll";

interface SportSelectorProps {
  selectedSportId: string;
  onSelectSport: (sport: SportMeta) => void;
  className?: string;
  filterCategory?: "foot" | "cycle" | "strength" | "water_racket_other";
}

export function SportSelector({
  selectedSportId,
  onSelectSport,
  className = "",
  filterCategory,
}: SportSelectorProps) {
  const sports = filterCategory
    ? SPORTS_CATALOG.filter((s) => s.category === filterCategory)
    : SPORTS_CATALOG;

  return (
    <div className={`w-full ${className}`}>
      <HScroll gap="gap-2" className="py-1">
        {sports.map((sport) => {
          const isSelected = sport.id === selectedSportId;
          return (
            <button
              key={sport.id}
              type="button"
              onClick={() => onSelectSport(sport)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none pressable active:scale-95 ${
                isSelected
                  ? "bg-[#FF2D55] text-white shadow-[0_2px_12px_rgba(255,45,85,0.35)]"
                  : "bg-[#18181D] text-white/80 border border-white/10 hover:bg-white/10"
              }`}
            >
              <span className="text-sm leading-none">{sport.emoji}</span>
              <span>{sport.name}</span>
            </button>
          );
        })}
      </HScroll>
    </div>
  );
}
