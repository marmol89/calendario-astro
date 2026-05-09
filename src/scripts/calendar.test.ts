import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  escapeHtml,
  getContrastColor,
  hexToRgba,
  taskAppliesOnDate,
  matchesSearch,
  matchesCompletedFilter,
  copyTask,
  isValidTask,
  debounce,
} from "./utils";
import type { Task } from "./utils";

// ── escapeHtml ─────────────────────────────────────────
describe("escapeHtml", () => {
  it("returns empty string for falsy values", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml(null as any)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("escapes HTML special characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).not.toContain("<script>");
    expect(escapeHtml("<img onerror=alert(1)>")).not.toContain("<");
    expect(escapeHtml("&")).toContain("&amp;");
  });

  it("returns plain text unchanged", () => {
    expect(escapeHtml("Hola Mundo")).toBe("Hola Mundo");
    expect(escapeHtml("Task #123")).toBe("Task #123");
  });
});

// ── getContrastColor ───────────────────────────────────
describe("getContrastColor", () => {
  it("returns dark text for light colors", () => {
    expect(getContrastColor("#ffffff")).toBe("#1e293b");
    expect(getContrastColor("#f8fafc")).toBe("#1e293b");
    expect(getContrastColor("#eef2ff")).toBe("#1e293b");
  });

  it("returns white text for dark colors", () => {
    expect(getContrastColor("#000000")).toBe("#ffffff");
    expect(getContrastColor("#1e293b")).toBe("#ffffff");
    expect(getContrastColor("#6366f1")).toBe("#ffffff");
  });

  it("returns fallback for falsy input", () => {
    expect(getContrastColor("")).toBe("#1e293b");
  });
});

// ── hexToRgba ──────────────────────────────────────────
describe("hexToRgba", () => {
  it("converts hex to rgba correctly", () => {
    expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255,0,0,0.5)");
    expect(hexToRgba("#00ff00", 1)).toBe("rgba(0,255,0,1)");
    expect(hexToRgba("#0000ff", 0.2)).toBe("rgba(0,0,255,0.2)");
  });

  it("uses fallback color when input is falsy", () => {
    const result = hexToRgba("", 0.5);
    expect(result).toContain("rgba");
  });
});

// ── taskAppliesOnDate ──────────────────────────────────
describe("taskAppliesOnDate", () => {
  const baseTask: Task = {
    id: 1,
    title: "Test",
    date: "2026-05-10",
    time: "",
    description: "",
    repeatType: "none",
    tagId: null,
    priority: "medium",
    completed: false,
  };

  it("matches exact date for non-repeating tasks", () => {
    expect(taskAppliesOnDate(baseTask, "2026-05-10")).toBe(true);
    expect(taskAppliesOnDate(baseTask, "2026-05-11")).toBe(false);
    expect(taskAppliesOnDate(baseTask, "2026-05-09")).toBe(false);
  });

  it("daily repeat matches any date after start", () => {
    const task = { ...baseTask, repeatType: "daily" as const };
    expect(taskAppliesOnDate(task, "2026-05-10")).toBe(true);
    expect(taskAppliesOnDate(task, "2026-05-15")).toBe(true);
    expect(taskAppliesOnDate(task, "2026-05-09")).toBe(false); // before start
  });

  it("weekly repeat matches same day of week", () => {
    // 2026-05-10 is a Sunday (getDay() = 0)
    const task = { ...baseTask, date: "2026-05-10", repeatType: "weekly" as const };
    expect(taskAppliesOnDate(task, "2026-05-17")).toBe(true); // Next Sunday
    expect(taskAppliesOnDate(task, "2026-05-11")).toBe(false); // Monday
    expect(taskAppliesOnDate(task, "2026-05-03")).toBe(false); // Before start
  });

  it("monthly repeat matches same day of month", () => {
    const task = { ...baseTask, date: "2026-05-10", repeatType: "monthly" as const };
    expect(taskAppliesOnDate(task, "2026-06-10")).toBe(true);
    expect(taskAppliesOnDate(task, "2026-05-10")).toBe(true);
    expect(taskAppliesOnDate(task, "2026-06-11")).toBe(false);
    expect(taskAppliesOnDate(task, "2026-04-10")).toBe(false); // before start
  });

  it("handles missing repeatType as none", () => {
    const task = { ...baseTask, repeatType: undefined as any };
    expect(taskAppliesOnDate(task, "2026-05-10")).toBe(true);
    expect(taskAppliesOnDate(task, "2026-05-11")).toBe(false);
  });
});

// ── matchesSearch ──────────────────────────────────────
describe("matchesSearch", () => {
  const task: Task = {
    id: 1,
    title: "Comprar leche",
    date: "2026-05-10",
    time: "",
    description: "En el supermercado",
    repeatType: "none",
    tagId: null,
    priority: "medium",
    completed: false,
  };

  it("matches empty search", () => {
    expect(matchesSearch(task, "")).toBe(true);
  });

  it("matches by title case-insensitive", () => {
    expect(matchesSearch(task, "comprar")).toBe(true);
    expect(matchesSearch(task, "COMPRAR")).toBe(true);
    expect(matchesSearch(task, "Leche")).toBe(true);
  });

  it("matches by description", () => {
    expect(matchesSearch(task, "supermercado")).toBe(true);
    expect(matchesSearch(task, "SUPER")).toBe(true);
  });

  it("does not match unrelated terms", () => {
    expect(matchesSearch(task, "xyz")).toBe(false);
    expect(matchesSearch(task, "pan")).toBe(false);
  });

  it("handles task without description", () => {
    const t = { ...task, description: "" };
    expect(matchesSearch(t, "supermercado")).toBe(false);
    expect(matchesSearch(t, "comprar")).toBe(true);
  });
});

// ── matchesCompletedFilter ─────────────────────────────
describe("matchesCompletedFilter", () => {
  const active: Task = {
    id: 1,
    title: "A",
    date: "2026-01-01",
    time: "",
    description: "",
    repeatType: "none",
    tagId: null,
    priority: "medium",
    completed: false,
  };
  const done = { ...active, id: 2, completed: true };

  it("shows all when filter is on", () => {
    expect(matchesCompletedFilter(active, true)).toBe(true);
    expect(matchesCompletedFilter(done, true)).toBe(true);
  });

  it("hides completed when filter is off", () => {
    expect(matchesCompletedFilter(active, false)).toBe(true);
    expect(matchesCompletedFilter(done, false)).toBe(false);
  });
});

// ── copyTask ───────────────────────────────────────────
describe("copyTask", () => {
  const task: Task = {
    id: 5,
    title: "X",
    date: "2026-05-01",
    time: "10:00",
    description: "desc",
    repeatType: "daily",
    tagId: 1,
    priority: "medium",
    completed: false,
  };

  it("adds displayDate property", () => {
    const result = copyTask(task, "2026-05-10");
    expect(result.displayDate).toBe("2026-05-10");
    expect(result.id).toBe(5);
    expect(result.title).toBe("X");
  });

  it("does not mutate original", () => {
    const orig = { ...task };
    copyTask(task, "2026-05-10");
    expect(task).toEqual(orig);
  });
});

// ── isValidTask ────────────────────────────────────────
describe("isValidTask", () => {
  it("validates a proper task object", () => {
    expect(
      isValidTask({ id: 1, title: "A", date: "2026-01-01" })
    ).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(isValidTask({ title: "A", date: "2026-01-01" })).toBe(false);
    expect(isValidTask({ id: 1, date: "2026-01-01" })).toBe(false);
    expect(isValidTask({ id: 1, title: "A" })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isValidTask(null)).toBe(false);
    expect(isValidTask(undefined)).toBe(false);
    expect(isValidTask("string")).toBe(false);
    expect(isValidTask(42)).toBe(false);
  });

  it("rejects wrong types", () => {
    expect(isValidTask({ id: "1", title: "A", date: "2026-01-01" })).toBe(false);
    expect(isValidTask({ id: 1, title: 123, date: "2026-01-01" })).toBe(false);
    expect(isValidTask({ id: 1, title: "A", date: 123 })).toBe(false);
  });
});

// ── debounce ───────────────────────────────────────────
describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays function execution", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("only executes once for rapid calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    debounced();
    debounced();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets timer on each call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    vi.advanceTimersByTime(100);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
