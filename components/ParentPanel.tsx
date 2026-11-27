'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { setStars, updateSettings } from '@/app/actions/parent-actions';
import { LogoutButton } from '@/components/LogoutButton';
import type { GameSettings } from '@/lib/game/state';
import type { ProgressSummary } from '@/lib/game/summary';

type Props = { initialSettings: GameSettings; stars: number; summary: ProgressSummary; loadError: boolean };

export function ParentPanel({ initialSettings, stars, summary, loadError }: Props) {
  const [s, setS] = useState(initialSettings);
  const [starCount, setStarCount] = useState(stars);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof GameSettings>(k: K, v: GameSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  function save() {
    start(async () => {
      const r = await updateSettings(s);
      setMsg(r.success ? 'נשמר ✓ (ייכנס לתוקף בפתיחה הבאה של המשחק)' : `שגיאה: ${r.error}`);
    });
  }

  function saveStars() {
    start(async () => {
      const r = await setStars(starCount);
      setMsg(r.success ? 'הכוכבים עודכנו ✓' : `שגיאה: ${r.error}`);
    });
  }

  const t = summary.totals;
  const tries = t.feedSuccess + t.feedMiss;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6 text-base">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">אזור הורים</h1>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            למשחק
          </Link>
          <LogoutButton />
        </div>
      </header>

      {loadError && <p className="rounded bg-red-50 p-3 text-sm text-red-700">חלק מהנתונים לא נטענו מהשרת.</p>}

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">התקדמות – 14 ימים אחרונים</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="קולות שהשמיע" value={t.vocalizations} />
          <Stat label="האכלות נכונות" value={tries ? `${t.feedSuccess}/${tries}` : '0'} />
          <Stat label="משחקים שהושלמו" value={t.games} />
        </div>
        {summary.days.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="text-right">יום</th>
                <th>קולות</th>
                <th>נכון</th>
                <th>טעות</th>
                <th>משחקים</th>
              </tr>
            </thead>
            <tbody>
              {summary.days.map((d) => (
                <tr key={d.day} className="border-t text-center">
                  <td className="py-1 text-right">{d.day}</td>
                  <td>{d.vocalizations}</td>
                  <td>{d.feedSuccess}</td>
                  <td>{d.feedMiss}</td>
                  <td>{d.games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">הגדרות</h2>
        <Range label="עוצמת קול" value={s.volume} onChange={(v) => set('volume', v)} />
        <Range
          label="רגישות מיקרופון (גבוה = מגיב גם לקולות שקטים)"
          value={s.micSensitivity}
          onChange={(v) => set('micSensitivity', v)}
        />
        <label className="flex items-center justify-between">
          סגנון הכלב
          <select
            className="rounded border px-2 py-1"
            value={s.dogStyle}
            onChange={(e) => set('dogStyle', e.target.value === '3d' ? '3d' : '2d')}
          >
            <option value="2d">דו-ממד</option>
            <option value="3d">תלת-ממד</option>
          </select>
        </label>
        <label className="flex items-center justify-between">
          הכלב חוזר על קולות
          <input type="checkbox" className="h-5 w-5" checked={s.echoEnabled} onChange={(e) => set('echoEnabled', e.target.checked)} />
        </label>
        <label className="flex items-center justify-between">
          להקריא שמות מאכלים
          <input type="checkbox" className="h-5 w-5" checked={s.speakNames} onChange={(e) => set('speakNames', e.target.checked)} />
        </label>
        <label className="flex items-center justify-between">
          מספר אפשרויות במשחק ההאכלה
          <select
            className="rounded border px-2 py-1"
            value={s.feedOptions}
            onChange={(e) => set('feedOptions', Number(e.target.value))}
          >
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between">
          הגבלת זמן משחק (דקות, 0 = ללא)
          <input
            type="number"
            min={0}
            max={120}
            className="w-20 rounded border px-2 py-1"
            value={s.sessionMinutes}
            onChange={(e) => set('sessionMinutes', Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
          />
        </label>
        <button onClick={save} disabled={pending} className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          שמירת הגדרות
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">כוכבים</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            className="w-28 rounded border px-2 py-1"
            value={starCount}
            onChange={(e) => setStarCount(Math.max(0, Number(e.target.value) || 0))}
          />
          <button onClick={saveStars} disabled={pending} className="rounded-md border px-4 py-1 disabled:opacity-50">
            עדכון
          </button>
        </div>
        <p className="text-xs text-slate-500">העדכון ייכנס לתוקף כשהמשחק ייפתח מחדש בטאבלט.</p>
      </section>

      {msg && <p className="text-sm text-slate-700">{msg}</p>}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Range({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span>{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
