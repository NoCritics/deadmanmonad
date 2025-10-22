import { TimeCalculation } from "../types/index";

/**
 * Calculate time remaining until deadline
 */
export function calculateTimeRemaining(deadlineTimestamp: number): TimeCalculation {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = deadlineTimestamp - now;
  const isPast = secondsRemaining <= 0;

  return {
    secondsRemaining: Math.max(0, secondsRemaining),
    humanReadable: formatDuration(Math.abs(secondsRemaining)),
    isPast,
    deadline: deadlineTimestamp,
  };
}

/**
 * Format seconds into human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return "Now";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && days === 0) parts.push(`${secs}s`); // Only show seconds if less than a day

  return parts.join(" ") || "0s";
}

/**
 * Period Unit Enum
 */
export enum PeriodUnit {
  MINUTES = "minutes",
  HOURS = "hours",
  DAYS = "days",
  WEEKS = "weeks",
  MONTHS = "months",
}

/**
 * Get deadline timestamp from current time + period
 * Supports flexible units: minutes (for testing), hours, days, weeks, months
 */
export function getDeadlineFromPeriod(
  period: number,
  unit: PeriodUnit = PeriodUnit.DAYS
): number {
  const now = Math.floor(Date.now() / 1000);
  let seconds = 0;

  switch (unit) {
    case PeriodUnit.MINUTES:
      seconds = period * 60;
      break;
    case PeriodUnit.HOURS:
      seconds = period * 60 * 60;
      break;
    case PeriodUnit.DAYS:
      seconds = period * 24 * 60 * 60;
      break;
    case PeriodUnit.WEEKS:
      seconds = period * 7 * 24 * 60 * 60;
      break;
    case PeriodUnit.MONTHS:
      // Approximate: 30 days per month
      seconds = period * 30 * 24 * 60 * 60;
      break;
    default:
      throw new Error(`Unknown period unit: ${unit}`);
  }

  return now + seconds;
}

/**
 * Convert period to human-readable string
 */
export function formatPeriod(period: number, unit: PeriodUnit): string {
  const unitStr = period === 1 ? unit.slice(0, -1) : unit; // Remove 's' for singular
  return `${period} ${unitStr}`;
}

/**
 * Get current Unix timestamp (seconds)
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Convert timestamp to readable date string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Check if current time is past deadline
 */
export function isDeadlinePassed(deadline: number): boolean {
  return getCurrentTimestamp() >= deadline;
}

/**
 * Calculate percentage of time elapsed
 */
export function getTimeElapsedPercentage(
  startTime: number,
  deadline: number
): number {
  const now = getCurrentTimestamp();
  const total = deadline - startTime;
  const elapsed = now - startTime;

  if (total <= 0) return 100;
  if (elapsed <= 0) return 0;

  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}
