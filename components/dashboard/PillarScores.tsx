import { ScoreGauge } from "./ScoreGauge";
import type { PillarScores as Scores } from "@/types";

interface PillarScoresProps {
  scores: Scores;
  size?: "sm" | "md" | "lg";
}

const pillars: { key: keyof Scores; label: string }[] = [
  { key: "performance", label: "Perf" },
  { key: "seo", label: "SEO" },
  { key: "security", label: "Sec" },
  { key: "malware", label: "Mal" },
];

export function PillarScores({ scores, size = "md" }: PillarScoresProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {pillars.map(({ key, label }) => (
        <ScoreGauge
          key={key}
          score={scores[key]}
          label={label}
          size={size}
        />
      ))}
    </div>
  );
}
