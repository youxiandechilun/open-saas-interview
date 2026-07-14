import { type DailyStats } from "wasp/entities";

// Retained for legacy dashboard components that are no longer routed. The
// external analytics/revenue job has intentionally been removed from startup.
export type DailyStatsProps = {
  dailyStats?: DailyStats;
  weeklyStats?: DailyStats[];
  isLoading?: boolean;
};
