export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

export function utcDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return utcDate(instant);
}
