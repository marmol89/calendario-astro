// ── Pure utility functions (no DOM dependencies) ──────

interface Task {
  id: number;
  title: string;
  date: string;
  time: string;
  description: string;
  repeatType: "none" | "daily" | "weekly" | "monthly";
  tagId: number | null;
  priority: "high" | "medium" | "low";
  completed: boolean;
  displayDate?: string;
}

export function escapeHtml(str: string | null | undefined): string {
  // Browser-safe: uses textContent to encode
  if (typeof document !== "undefined") {
    if (!str) return "";
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }
  // Fallback for SSR / test environments without full DOM
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as unknown as T;
}

export function getContrastColor(hex: string): string {
  if (!hex) return "#1e293b";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#1e293b" : "#ffffff";
}

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) hex = "#6366f1";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function taskAppliesOnDate(task: Task, dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const td = new Date(task.date + "T00:00:00");
  if (!task.repeatType || task.repeatType === "none") return task.date === dateStr;
  if (d < td) return false;
  if (task.repeatType === "daily") return true;
  if (task.repeatType === "weekly") return d.getDay() === td.getDay();
  if (task.repeatType === "monthly") return d.getDate() === td.getDate();
  return false;
}

export function matchesSearch(task: Task, searchTerm: string): boolean {
  if (!searchTerm) return true;
  const t = searchTerm.toLowerCase();
  return (
    task.title.toLowerCase().includes(t) ||
    (!!task.description && task.description.toLowerCase().includes(t))
  );
}

export function matchesCompletedFilter(task: Task, showCompleted: boolean): boolean {
  if (showCompleted) return true;
  return !task.completed;
}

export function copyTask<T extends Task>(t: T, dateStr: string): T & { displayDate: string } {
  return { ...t, displayDate: dateStr };
}

export function isValidTask(t: any): t is Task {
  return !!(t && typeof t.id === "number" && typeof t.title === "string" && typeof t.date === "string");
}

export type { Task };

export interface Tag {
  id: number;
  name: string;
  color: string;
}
