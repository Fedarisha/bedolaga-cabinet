import type { ReactNode } from 'react';
import { PiDeviceMobile, PiHardDrives } from 'react-icons/pi';
import type { LandingCopy } from './copy';

interface Sheet {
  seq: string;
  delay: number;
  /** Resting position (percent of the lane) under prefers-reduced-motion. */
  at: number;
}

/**
 * Sequence numbers are deliberately coherent with the wire protocol:
 * client files (c_) travel device → bucket → server, so the lane closer to
 * the server carries slightly older numbers; server replies (s_) go the
 * other way. Nobody will check, but the diagram tells the truth.
 */
const LANES: { up: Sheet[]; down: Sheet[] }[] = [
  {
    up: [{ seq: 'c_0000002b', delay: 0, at: 50 }],
    down: [{ seq: 's_00000019', delay: 2.4, at: 50 }],
  },
  {
    up: [{ seq: 'c_0000002a', delay: 1.2, at: 50 }],
    down: [{ seq: 's_0000001a', delay: 3.6, at: 50 }],
  },
];

const BucketIcon = () => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-7 w-7"
    aria-hidden="true"
  >
    <ellipse cx="16" cy="8" rx="11" ry="3.5" />
    <path d="M5 8l2.2 16.5c.2 1.6 4.2 3 8.8 3s8.6-1.4 8.8-3L27 8" />
    <path d="M7.6 15.6c2 1.6 5 2.4 8.4 2.4s6.4-.8 8.4-2.4" opacity="0.55" />
  </svg>
);

function Node({
  icon,
  label,
  sub,
  emphasis,
}: {
  icon: ReactNode;
  label: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex min-w-[56px] flex-col items-center gap-1.5 sm:min-w-[72px]">
      <div
        className={
          emphasis
            ? 'grid h-12 w-12 place-items-center rounded-2xl border border-accent-500/40 bg-accent-500/15 text-accent-300 shadow-[0_0_0_6px_rgb(var(--color-accent-500)/0.08)] sm:h-14 sm:w-14'
            : 'grid h-11 w-11 place-items-center rounded-2xl border border-dark-700/60 bg-dark-800/80 text-dark-200 sm:h-12 sm:w-12'
        }
      >
        {icon}
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-dark-100 sm:text-sm">{label}</div>
        {sub && <div className="hidden font-mono text-[10px] text-dark-500 sm:block">{sub}</div>}
      </div>
    </div>
  );
}

function Lane({ up, down }: { up: Sheet[]; down: Sheet[] }) {
  const render = (sheets: Sheet[], reply: boolean) =>
    sheets.map((s) => (
      <span
        key={s.seq}
        className={`fed-sheet${reply ? ' fed-sheet--reply' : ''}`}
        style={
          {
            '--fed-delay': `${s.delay}s`,
            '--fed-static': `${s.at}%`,
          } as React.CSSProperties
        }
        aria-hidden="true"
      >
        <span>{s.seq}</span>
      </span>
    ));

  return (
    <div className="fed-relay-lane">
      <div className="fed-relay-track fed-relay-track--up">{render(up, false)}</div>
      <div className="fed-relay-track fed-relay-track--down">{render(down, true)}</div>
    </div>
  );
}

export default function RelayDiagram({ copy }: { copy: LandingCopy['relay'] }) {
  return (
    <figure className="card relative overflow-hidden p-4 sm:p-6">
      <div className="fed-relay" role="img" aria-label={copy.caption}>
        <Node icon={<PiDeviceMobile className="h-6 w-6" />} label={copy.you} />
        <Lane {...LANES[0]} />
        <Node icon={<BucketIcon />} label={copy.bucket} sub={copy.bucketPath} emphasis />
        <Lane {...LANES[1]} />
        <Node icon={<PiHardDrives className="h-6 w-6" />} label={copy.server} />
      </div>

      <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-dark-500">
        <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-accent-500" aria-hidden="true" />
        c_ →
        <span
          className="ml-2 inline-block h-2.5 w-2.5 rounded-[2px] bg-[rgb(var(--fed-warm))]"
          aria-hidden="true"
        />
        ← s_
      </div>

      <figcaption className="mt-3 text-xs leading-relaxed text-dark-400 sm:text-sm">
        {copy.caption}
      </figcaption>
    </figure>
  );
}
