import { getGameState } from '@/app/actions/game-actions';
import { getProgressSummary } from '@/app/actions/parent-actions';
import { ParentPanel } from '@/components/ParentPanel';
import { DEFAULT_PLAYER, DEFAULT_SETTINGS } from '@/lib/game/state';

export const dynamic = 'force-dynamic';

export default async function ParentPage() {
  const [state, summary] = await Promise.all([getGameState(), getProgressSummary(14)]);
  return (
    <ParentPanel
      initialSettings={state.data?.settings ?? DEFAULT_SETTINGS}
      stars={state.data?.player.stars ?? DEFAULT_PLAYER.stars}
      summary={summary.data ?? { days: [], totals: { vocalizations: 0, feedSuccess: 0, feedMiss: 0, games: 0 } }}
      loadError={!state.success || !summary.success}
    />
  );
}
