import { BookOpen, Brain, Coffee, Cog, Keyboard, type LucideIcon, Search, Sofa, TriangleAlert, Users } from "lucide-react";
import type { Activity } from "../../core/activity";
import { cx } from "./ui";

export const ACTIVITY_ICON: Record<Activity, LucideIcon> = {
  idle: Coffee,
  queued: Sofa,
  thinking: Brain,
  typing: Keyboard,
  reading: BookOpen,
  researching: Search,
  running: Cog,
  delegating: Users,
  stuck: TriangleAlert,
};

export const isWorking = (a: Activity) => !["idle", "queued", "stuck"].includes(a);

export const activityColor = (a: Activity) =>
  a === "stuck" ? "var(--stuck)" : a === "queued" ? "var(--wait)" : isWorking(a) ? "var(--accent)" : "var(--muted)";

export function ActivityIcon({ activity, size = 13 }: { activity: Activity; size?: number }) {
  const Icon = ACTIVITY_ICON[activity];
  return <Icon size={size} strokeWidth={2} aria-hidden style={{ color: activityColor(activity) }} />;
}

// The one moving thing: a soft breathing dot while a Peep works.
export function StatusDot({ activity }: { activity: Activity }) {
  return (
    <span
      className={cx("size-[7px] shrink-0 rounded-full", isWorking(activity) && "working-dot")}
      style={{ background: activityColor(activity) }}
      aria-hidden
    />
  );
}

export function ActivityPill({ activity, label, className }: { activity: Activity; label: string; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5", className)}>
      <ActivityIcon activity={activity} />
      <span>{label}</span>
    </span>
  );
}
