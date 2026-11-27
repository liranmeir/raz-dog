export type DayStats = {
  day: string; // YYYY-MM-DD in Asia/Jerusalem
  vocalizations: number;
  feedSuccess: number;
  feedMiss: number;
  games: number;
};

export type ProgressSummary = { days: DayStats[]; totals: Omit<DayStats, 'day'> };

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' });

export function summarizeEvents(events: { game: string; kind: string; createdAt: Date }[]): ProgressSummary {
  const byDay = new Map<string, DayStats>();
  const totals = { vocalizations: 0, feedSuccess: 0, feedMiss: 0, games: 0 };

  for (const e of events) {
    const day = dayFmt.format(e.createdAt);
    let d = byDay.get(day);
    if (!d) {
      d = { day, vocalizations: 0, feedSuccess: 0, feedMiss: 0, games: 0 };
      byDay.set(day, d);
    }
    if (e.kind === 'vocalize') {
      d.vocalizations++;
      totals.vocalizations++;
    } else if (e.game === 'feed' && e.kind === 'success') {
      d.feedSuccess++;
      totals.feedSuccess++;
    } else if (e.game === 'feed' && e.kind === 'miss') {
      d.feedMiss++;
      totals.feedMiss++;
    } else if (e.kind === 'round_complete') {
      d.games++;
      totals.games++;
    }
  }

  const days = [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
  return { days, totals };
}
