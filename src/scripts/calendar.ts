// ── Types ──────────────────────────────────────────────
import type { Task } from "./utils";
import {
  escapeHtml,
  debounce,
  getContrastColor,
  hexToRgba,
  taskAppliesOnDate,
  matchesSearch as utilsMatchesSearch,
  matchesCompletedFilter as utilsMatchesCompletedFilter,
  copyTask,
  isValidTask,
} from "./utils";
import { t as i18n, setLang, getLang, applyTranslations } from "./i18n";
import type { Lang } from "./i18n";
import { pullFromCloud, pushToCloud, ensureSession } from "./supabase";
import { generateICS } from "./ical";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

interface Tag {
  id: number;
  name: string;
  color: string;
}

type ViewMode = "month" | "week" | "day";

interface TaskDisplay extends Task {
  displayDate: string;
}

// ── Helpers ────────────────────────────────────────────
function isNativeApp(): boolean {
  return !!(window as any).Capacitor;
}
function getLocale(): string {
  return getLang() === "en" ? "en-US" : "es-ES";
}

// ── State ──────────────────────────────────────────────
function safeLoadJSON(key: string, fallback: any): any {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Basic structure validation
    if (key === "calendar_tasks" && !Array.isArray(parsed)) throw new Error("Invalid tasks");
    if (key === "calendar_tags" && !Array.isArray(parsed)) throw new Error("Invalid tags");
    return parsed;
  } catch {
    console.warn(`[Calendario] Datos corruptos en "${key}", usando valores por defecto.`);
    localStorage.removeItem(key);
    return fallback;
  }
}

let currentViewDate = new Date();

// Priority config
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

let tasks: Task[] = safeLoadJSON("calendar_tasks", []);
let tags: Tag[] = safeLoadJSON("calendar_tags", [
  { id: 1, name: "Trabajo", color: "#6366f1" },
  { id: 2, name: "Personal", color: "#10b981" },
  { id: 3, name: "Urgente", color: "#ef4444" },
  { id: 4, name: "Ocio", color: "#f59e0b" },
  { id: 5, name: "Salud", color: "#ec4899" },
]);
let editingTaskId: number | null = null;
let currentDetailTaskId: number | null = null;
let isDarkMode: boolean = JSON.parse(localStorage.getItem("dark_mode") || "false");
let viewMode: ViewMode = (localStorage.getItem("view_mode") as ViewMode) || "month";
let showCompleted: boolean = JSON.parse(localStorage.getItem("show_completed") || "true");
let notifyEnabled: boolean = JSON.parse(localStorage.getItem("notify_enabled") || "false");
let notifyInterval: ReturnType<typeof setInterval> | null = null;
let dragTaskId: number | null = null;
let deletedTaskIds: number[] = [];
let deletedTagIds: number[] = [];

// Full sync on load: pull + push (merge only new items, never overwrite)
async function fullSync(): Promise<void> {
  if (!isCloudConfigured()) return;

  const userId = await ensureSession();
  if (!userId) {
    _syncStatus = "offline";
    updateSyncIcon();
    return;
  }

  // Pull from cloud and merge into local (local wins on conflicts)
  const cloud = await pullFromCloud(userId);
  if (cloud) {
    const localTaskIds = new Set(tasks.map((t) => t.id));
    const localTagIds = new Set(tags.map((t) => t.id));
    let added = 0;

    for (const ct of cloud.tasks) {
      if (!localTaskIds.has(ct.id)) {
        tasks.push(ct);
        added++;
      }
    }
    for (const ct of cloud.tags) {
      if (!localTagIds.has(ct.id)) {
        tags.push(ct);
        added++;
      }
    }
    if (added > 0) {
      persistState();
      render();
    }
  }

  // Push local changes + deletions to cloud
  await pushToCloud(userId, tasks, tags);
}

function isCloudConfigured(): boolean {
  return !!(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
}

// Debounced sync — runs after mutations settle (background, never blocks)
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _syncStatus: "synced" | "syncing" | "offline" | "error" = "offline";

function updateSyncIcon(): void {
  const icon = document.getElementById("syncIcon");
  if (!icon) return;
  const statusEl = document.getElementById("syncStatusText");
  const colors: Record<string, string> = {
    synced: "#10b981",
    syncing: "#f59e0b",
    offline: "#94a3b8",
    error: "#ef4444",
  };
  const labels: Record<string, string> = {
    synced: i18n("sync.synced"),
    syncing: i18n("sync.syncing"),
    offline: i18n("sync.offline"),
    error: i18n("sync.error"),
  };
  icon.style.color = colors[_syncStatus] || "#94a3b8";
  if (statusEl) statusEl.textContent = labels[_syncStatus] || "";
}

function scheduleSync(): void {
  if (!isCloudConfigured()) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    _syncStatus = "syncing";
    updateSyncIcon();
    pushOnlySync()
      .then(() => {
        _syncStatus = "synced";
        updateSyncIcon();
      })
      .catch(() => {
        _syncStatus = "error";
        updateSyncIcon();
      });
  }, 2000);
}

// Push-only sync (scheduled — no pull, avoids re-importing deleted items)
async function pushOnlySync(): Promise<void> {
  const userId = await ensureSession();
  if (!userId) { _syncStatus = "offline"; updateSyncIcon(); return; }
  await pushToCloud(userId, tasks, tags, deletedTaskIds, deletedTagIds);
  deletedTaskIds = [];
  deletedTagIds = [];
}

// ── Undo / Redo ────────────────────────────────────────
const MAX_UNDO = 50;
let undoStack: Array<{ tasks: Task[]; tags: Tag[] }> = [];
let redoStack: Array<{ tasks: Task[]; tags: Tag[] }> = [];

function pushUndo(): void {
  undoStack.push({ tasks: structuredClone(tasks), tags: structuredClone(tags) });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
}

function undo(): void {
  if (undoStack.length === 0) return;
  redoStack.push({ tasks: structuredClone(tasks), tags: structuredClone(tags) });
  const prev = undoStack.pop()!;
  tasks = prev.tasks;
  tags = prev.tags;
  persistState();
  render();
}

function redo(): void {
  if (redoStack.length === 0) return;
  undoStack.push({ tasks: structuredClone(tasks), tags: structuredClone(tags) });
  const next = redoStack.pop()!;
  tasks = next.tasks;
  tags = next.tags;
  persistState();
  render();
}

// ── Utilities ──────────────────────────────────────────
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) console.warn(`[Calendario] Elemento #${id} no encontrado`);
  return el!;
}

const debouncedRender = debounce(render, 200);

function highlightText(text: string, term: string): string {
  if (!term || term.length < 2) return escapeHtml(text);
  const escaped = escapeHtml(text);
  // Escape regex special chars in search term
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${safe})`, "gi");
  return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function persistState(): void {
  localStorage.setItem("calendar_tasks", JSON.stringify(tasks));
  localStorage.setItem("calendar_tags", JSON.stringify(tags));
}

function saveAll(): void {
  persistState();
  render();
  scheduleSync();
}

function saveAllWithUndo(): void {
  pushUndo();
  saveAll();
}

function saveTasks(): void {
  persistState();
  render();
}

// ── Dark Mode ──────────────────────────────────────────
function initDarkMode(): void {
  if (isDarkMode) {
    document.body.classList.add("dark");
    $("sunIcon").classList.remove("hidden");
    $("moonIcon").classList.add("hidden");
  }
}

function toggleDarkMode(): void {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle("dark");
  $("sunIcon").classList.toggle("hidden");
  $("moonIcon").classList.toggle("hidden");
  localStorage.setItem("dark_mode", JSON.stringify(isDarkMode));
}

// ── View Navigation ────────────────────────────────────
function setView(mode: ViewMode): void {
  viewMode = mode;
  localStorage.setItem("view_mode", mode);
  ["btnMonthView", "btnWeekView", "btnDayView"].forEach((id) => {
    $(id).className =
      "px-3 py-1.5 text-xs font-medium text-secondary hover:bg-subtle transition-all";
  });
  const btn = $(mode === "month" ? "btnMonthView" : mode === "week" ? "btnWeekView" : "btnDayView");
  btn.className = "px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white transition-all";

  // Update aria-selected for tablist
  ["btnMonthView", "btnWeekView", "btnDayView"].forEach((id) => {
    $(id).setAttribute("aria-selected", id === btn.id ? "true" : "false");
  });

  render();
}

function changeView(offset: number): void {
  const direction = offset > 0 ? "slide-in-right" : "slide-in-left";
  if (viewMode === "month") currentViewDate.setMonth(currentViewDate.getMonth() + offset);
  else if (viewMode === "week") currentViewDate.setDate(currentViewDate.getDate() + offset * 7);
  else currentViewDate.setDate(currentViewDate.getDate() + offset);
  render();
  // Animate calendar grid
  const cg = $("calendarGrid");
  cg.classList.add(direction);
  setTimeout(() => cg.classList.remove(direction), 300);
}

function resetToToday(): void {
  currentViewDate = new Date();
  render();
}

// ── Search & Filter ────────────────────────────────────
function getSearchTerm(): string {
  const el = $("searchInput") as HTMLInputElement;
  return el ? el.value.trim().toLowerCase() : "";
}

function matchesSearch(task: Task): boolean {
  return utilsMatchesSearch(task, getSearchTerm());
}

function matchesCompletedFilter(task: Task): boolean {
  return utilsMatchesCompletedFilter(task, showCompleted);
}

function getTasksForDate(dateStr: string): Task[] {
  return tasks.filter(
    (t) => taskAppliesOnDate(t, dateStr) && matchesSearch(t) && matchesCompletedFilter(t)
  );
}

// ── Tag Management ─────────────────────────────────────
function getTag(tagId: number | null): Tag | undefined {
  return tags.find((tg) => tg.id === tagId);
}

function getTagColor(tagId: number | null): string {
  const t = getTag(tagId);
  return t ? t.color : "#6366f1";
}

function getTagName(tagId: number | null): string {
  const tg = getTag(tagId);
  return tg ? tg.name : i18n("value.noTag");
}

function getSelectedTagId(): number | null {
  const sel = $("tagPicker").querySelector(".selected") as HTMLElement | null;
  return sel ? parseInt(sel.dataset.tagId || "") : tags.length > 0 ? tags[0].id : null;
}

function setSelectedTag(tagId: number | null): void {
  Array.from($("tagPicker").children).forEach((el) => {
    el.classList.toggle("selected", parseInt((el as HTMLElement).dataset.tagId || "") === tagId);
  });
}

function renderTagPicker(): void {
  const picker = $("tagPicker");
  picker.innerHTML = "";
  tags.forEach((tg, i) => {
    const el = document.createElement("span");
    el.className = "tag-option" + (i === 0 ? " selected" : "");
    el.dataset.tagId = String(tg.id);
    el.style.backgroundColor = tg.color + "22";
    el.style.color = tg.color;
    el.style.borderColor = tg.color + "44";
    el.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background-color:${tg.color};"></span>${escapeHtml(tg.name)}`;
    el.onclick = () => {
      Array.from(picker.children).forEach((e) => e.classList.remove("selected"));
      el.classList.add("selected");
    };
    picker.appendChild(el);
  });
}

function openTagManager(): void {
  renderTagList();
  $("tagManagerModal").classList.remove("hidden");
  setTimeout(() => $("tagManagerContent").classList.add("modal-active"), 10);
}

function closeTagManager(): void {
  $("tagManagerContent").classList.remove("modal-active");
  setTimeout(() => {
    $("tagManagerModal").classList.add("hidden");
    renderTagPicker();
    render();
  }, 200);
}

function addTag(): void {
  const nameInput = $("newTagName") as HTMLInputElement;
  const colorInput = $("newTagColor") as HTMLInputElement;
  const n = nameInput.value.trim();
  const c = colorInput.value;
  if (!n) return;
  tags.push({ id: Date.now(), name: n, color: c });
  saveAllWithUndo();
  renderTagList();
  renderTagPicker();
  nameInput.value = "";
}

function deleteTag(id: number): void {
  // Alert messages using i18n
  if (tags.length <= 1) {
    alert(i18n("alert.minTags"));
    return;
  }
  if (confirm(i18n("alert.deleteTag"))) {
    deletedTagIds.push(id);
    tags = tags.filter((tg) => tg.id !== id);
    saveAllWithUndo();
    renderTagList();
    renderTagPicker();
  }
}

function renderTagList(): void {
  const list = $("tagList");
  list.innerHTML = "";
  tags.forEach((tg) => {
    const el = document.createElement("div");
    el.className = "flex items-center justify-between p-2 rounded-lg border border-slate";
    el.innerHTML = `<div class="flex items-center gap-2"><span style="width:12px;height:12px;border-radius:50%;background-color:${tg.color};"></span><span class="text-sm text-primary">${escapeHtml(tg.name)}</span></div><button onclick="deleteTag(${tg.id})" class="text-secondary hover:text-red-500 text-xs">Eliminar</button>`;
    list.appendChild(el);
  });
}

// ── Drag & Drop ────────────────────────────────────────
let touchClone: HTMLElement | null = null;
let touchTaskId: number | null = null;
let touchTargetCell: HTMLElement | null = null;

function handleDragStart(this: HTMLElement, e: DragEvent, taskId: number): void {
  if (!taskId) return;
  const t = tasks.find((x) => x.id === taskId);
  if (t && t.repeatType && t.repeatType !== "none") {
    e.preventDefault();
    return;
  }
  dragTaskId = taskId;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
  }
  this.classList.add("drag-ghost");
}

function handleDragEnd(this: HTMLElement): void {
  this.classList.remove("drag-ghost");
  dragTaskId = null;
}

function handleDragOver(this: HTMLElement, e: DragEvent): void {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  this.classList.add("drag-over");
}

function handleDragLeave(this: HTMLElement): void {
  this.classList.remove("drag-over");
}

function handleDrop(this: HTMLElement, e: DragEvent, dateStr: string): void {
  e.preventDefault();
  this.classList.remove("drag-over");
  moveToDateStr(this, e.dataTransfer?.getData("text/plain") || String(dragTaskId), dateStr);
}

function moveToDateStr(el: HTMLElement, taskIdStr: string, dateStr: string): void {
  el.classList.remove("drag-over");
  const id = parseInt(taskIdStr);
  if (!id) return;
  const t = tasks.find((x) => x.id === id);
  if (!t || (t.repeatType && t.repeatType !== "none")) return;
  t.date = dateStr;
  saveAllWithUndo();
}

// ── Touch Drag & Drop ──────────────────────────────────
function getDateStrFromCell(el: HTMLElement): string | null {
  return el.dataset.dateStr || null;
}

function handleTouchStart(this: HTMLElement, e: TouchEvent, taskId: number): void {
  const t = tasks.find((x) => x.id === taskId);
  if (t && t.repeatType && t.repeatType !== "none") return;

  const touch = e.touches[0];
  touchTaskId = taskId;

  // Create floating clone
  touchClone = this.cloneNode(true) as HTMLElement;
  touchClone.style.position = "fixed";
  touchClone.style.zIndex = "9999";
  touchClone.style.pointerEvents = "none";
  touchClone.style.opacity = "0.85";
  touchClone.style.transform = "scale(1.05)";
  touchClone.style.left = touch.clientX - 40 + "px";
  touchClone.style.top = touch.clientY - 15 + "px";
  touchClone.style.width = "auto";
  touchClone.style.maxWidth = "200px";
  document.body.appendChild(touchClone);

  this.style.opacity = "0.4";
  e.preventDefault();
}

function handleTouchMove(e: TouchEvent): void {
  if (!touchClone) return;
  const touch = e.touches[0];
  touchClone.style.left = touch.clientX - 40 + "px";
  touchClone.style.top = touch.clientY - 15 + "px";

  // Find the cell under the finger
  touchClone.style.display = "none";
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  touchClone.style.display = "";

  if (touchTargetCell) touchTargetCell.classList.remove("drag-over");

  const cell = el?.closest(".day-cell") as HTMLElement | null;
  if (cell && cell.dataset.dateStr) {
    touchTargetCell = cell;
    touchTargetCell.classList.add("drag-over");
  } else {
    touchTargetCell = null;
  }
  e.preventDefault();
}

function handleTouchEnd(this: HTMLElement, _e: TouchEvent): void {
  if (touchClone) {
    touchClone.remove();
    touchClone = null;
  }
  this.style.opacity = "";
  if (touchTargetCell) {
    touchTargetCell.classList.remove("drag-over");
    const ds = getDateStrFromCell(touchTargetCell);
    if (ds && touchTaskId) {
      moveToDateStr(touchTargetCell, String(touchTaskId), ds);
    }
    touchTargetCell = null;
  }
  touchTaskId = null;
}

function handleTouchEndGlobal(_e: TouchEvent): void {
  // Fallback if touch ends outside the original element
  if (touchClone) {
    touchClone.remove();
    touchClone = null;
  }
  if (touchTargetCell) {
    touchTargetCell.classList.remove("drag-over");
    touchTargetCell = null;
  }
  touchTaskId = null;
}

// ── Calendar Rendering ─────────────────────────────────
function renderCalendarCell(
  day: number,
  month: number,
  year: number,
  isPad: boolean,
  padOffset: number
): HTMLElement {
  const el = document.createElement("div");
  const today = new Date();
  const isToday =
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  let cls = "day-cell";
  if (isToday && !isPad) cls += " today";
  if (viewMode === "week") cls += " week-cell";
  if (isPad) cls += " text-secondary bg-ghost/50";
  el.className = cls;

  if (isPad) {
    el.textContent = String(day);
    el.onclick = () => {
      currentViewDate.setMonth(currentViewDate.getMonth() + padOffset);
      if (viewMode === "week") setView("month");
      render();
    };
  } else {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    el.dataset.dateStr = ds;
    const dts = getTasksForDate(ds);
    const nl = document.createElement("span");
    nl.className = "font-semibold text-primary block mb-1";
    nl.textContent = String(day);
    el.appendChild(nl);
    el.onclick = () => {
      const tasksOnDay = getTasksForDate(ds);
      if (tasksOnDay.length === 0) {
        // Quick add: open modal with date pre-filled
        openModal(undefined, ds);
      } else {
        showDayDetails(ds);
      }
    };
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", function (e: DragEvent) {
      handleDrop.call(this, e, ds);
    });
    dts.forEach((t) => {
      const tc = getTagColor(t.tagId);
      const b = document.createElement("div");
      b.className = "task-badge" + (t.completed ? " completed" : "");
      b.style.backgroundColor = hexToRgba(tc, 0.2);
      b.style.color = tc;
      b.style.borderLeft = `3px solid ${tc}`;
      b.textContent = `${t.repeatType && t.repeatType !== "none" ? "\u21BB " : ""}${t.time ? t.time + " " : ""}${t.title}`;
      b.draggable = !t.repeatType || t.repeatType === "none";
      b.addEventListener("dragstart", function (e: DragEvent) {
        handleDragStart.call(this, e, t.id);
      });
      b.addEventListener("dragend", handleDragEnd);
      // Touch support
      b.addEventListener("touchstart", function (e: TouchEvent) {
        handleTouchStart.call(this, e, t.id);
      }, { passive: false });
      b.addEventListener("touchmove", handleTouchMove, { passive: false });
      b.addEventListener("touchend", function (e: TouchEvent) {
        handleTouchEnd.call(this, e);
      });
      b.onclick = (e) => {
        e.stopPropagation();
        showTaskDetails(t.id);
      };
      el.appendChild(b);
    });
  }
  return el;
}

function render(): void {
  try {
    _render();
  } catch (err) {
    console.error("[Calendario] Error al renderizar:", err);
    const cg = $("calendarGrid");
    cg.innerHTML =
      `<p class="text-red-500 text-sm p-4">${i18n("alert.renderError")}</p>`;
  }
}

function _render(): void {
  const y = currentViewDate.getFullYear();
  const m = currentViewDate.getMonth();
  const cg = $("calendarGrid");
  const dv = $("dayView");
  const dh = $("dayHeaders");
  cg.innerHTML = "";
  dv.innerHTML = "";
  dv.classList.add("hidden");
  dh.classList.remove("hidden");

  if (viewMode === "day") {
    cg.classList.add("hidden");
    dh.classList.add("hidden");
    dv.classList.remove("hidden");
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(currentViewDate.getDate()).padStart(2, "0")}`;
    const dts = getTasksForDate(ds);
    const dn = currentViewDate.toLocaleDateString(getLocale(), {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    $("monthDisplay").textContent = dn.charAt(0).toUpperCase() + dn.slice(1);
    $("sidebarTitleText").textContent = i18n("sidebar.day");
    for (let h = 0; h < 24; h++) {
      const hr = document.createElement("div");
      hr.className = "day-view-hour";
      const hl = String(h).padStart(2, "0") + ":00";
      hr.innerHTML = `<span class="text-xs text-secondary w-12 shrink-0">${hl}</span><div class="flex-1 flex flex-wrap gap-1"></div>`;
      const slot = hr.children[1];
      dts.forEach((t) => {
        if (t.time && parseInt(t.time.split(":")[0]) === h) {
          const tc = getTagColor(t.tagId);
          const b = document.createElement("div");
          b.className = "task-badge" + (t.completed ? " completed" : "");
          b.style.backgroundColor = hexToRgba(tc, 0.2);
          b.style.color = tc;
          b.style.borderLeft = `3px solid ${tc}`;
          b.textContent = `${t.time} ${t.title}`;
          b.draggable = !t.repeatType || t.repeatType === "none";
          b.addEventListener("dragstart", function (e: DragEvent) {
            handleDragStart.call(this, e, t.id);
          });
          b.addEventListener("dragend", handleDragEnd);
          b.onclick = (e) => {
            e.stopPropagation();
            showTaskDetails(t.id);
          };
          slot.appendChild(b);
        }
      });
      const now = new Date();
      if (
        now.getFullYear() === y &&
        now.getMonth() === m &&
        now.getDate() === currentViewDate.getDate() &&
        now.getHours() === h
      ) {
        hr.style.backgroundColor = "var(--accent-light)";
      }
      dv.appendChild(hr);
    }
  } else if (viewMode === "week") {
    cg.classList.remove("hidden");
    const dow = currentViewDate.getDay();
    const mo = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(y, m, currentViewDate.getDate() + mo);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    $("monthDisplay").textContent =
      `${mon.getDate()} ${mon.toLocaleDateString(getLocale(), { month: "short" })} - ${sun.getDate()} ${sun.toLocaleDateString(getLocale(), { month: "short" })}, ${mon.getFullYear()}`;
    $("sidebarTitleText").textContent = i18n("sidebar.week");
    for (const d = new Date(mon); d <= sun; d.setDate(d.getDate() + 1)) {
      cg.appendChild(
        renderCalendarCell(d.getDate(), d.getMonth(), d.getFullYear(), d.getMonth() !== m, d.getMonth() < m ? -1 : 1)
      );
    }
  } else {
    cg.classList.remove("hidden");
    $("monthDisplay").textContent =
      currentViewDate
        .toLocaleDateString(getLocale(), { month: "long", year: "numeric" })
        .replace(/^\w/, (c) => c.toUpperCase());
    $("sidebarTitleText").textContent = i18n("sidebar.month");
    const fd = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const pmd = new Date(y, m, 0).getDate();
    const sd = fd === 0 ? 6 : fd - 1;
    const cn = sd + dim;
    for (let i = sd; i > 0; i--) cg.appendChild(renderCalendarCell(pmd - i + 1, m - 1, y, true, -1));
    for (let d2 = 1; d2 <= dim; d2++) cg.appendChild(renderCalendarCell(d2, m, y, false, 0));
    const rem = cn % 7;
    let nmd = 0;
    if (rem !== 0) nmd = 7 - rem;
    else if (cn < 35) nmd = 7;
    for (let i = 1; i <= nmd; i++) cg.appendChild(renderCalendarCell(i, m + 1, y, true, 1));
  }

  // Sidebar
  let ft: TaskDisplay[];
  if (viewMode === "day") {
    const ds2 = `${y}-${String(m + 1).padStart(2, "0")}-${String(currentViewDate.getDate()).padStart(2, "0")}`;
    ft = getTasksForDate(ds2).map((t) => copyTask(t, ds2));
  } else if (viewMode === "week") {
    ft = getWeekTasks();
  } else {
    ft = getMonthTasks(m, y);
  }
  renderSidebar(ft);
}

// ── Week/Month Task Collectors ─────────────────────────
function getWeekTasks(): TaskDisplay[] {
  const dow = currentViewDate.getDay();
  const mo = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(
    currentViewDate.getFullYear(),
    currentViewDate.getMonth(),
    currentViewDate.getDate() + mo
  );
  const seen: Record<number, boolean> = {};
  const result: TaskDisplay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    getTasksForDate(ds).forEach((t) => {
      if (!seen[t.id]) {
        seen[t.id] = true;
        result.push(copyTask(t, ds));
      }
    });
  }
  return result.sort((a, b) => new Date(a.displayDate).getTime() - new Date(b.displayDate).getTime());
}

function getMonthTasks(m: number, y: number): TaskDisplay[] {
  const seen: Record<number, boolean> = {};
  const result: TaskDisplay[] = [];
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    getTasksForDate(ds).forEach((t) => {
      if (!seen[t.id]) {
        seen[t.id] = true;
        result.push(copyTask(t, ds));
      }
    });
  }
  return result.sort((a, b) => new Date(a.displayDate).getTime() - new Date(b.displayDate).getTime());
}

// ── Sidebar Rendering ──────────────────────────────────
function renderSidebar(ft: TaskDisplay[]): void {
  // Sort by priority (high first), then by date
  ft.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority || "medium"] ?? 1;
    const pb = PRIORITY_ORDER[b.priority || "medium"] ?? 1;
    if (pa !== pb) return pa - pb;
    return new Date(a.displayDate).getTime() - new Date(b.displayDate).getTime();
  });

  const total = ft.length;
  const comp = ft.filter((t) => t.completed).length;
  const pend = total - comp;
  $("sidebarStats").innerHTML =
    `<span class="stat-dot" style="background-color:#10b981;"></span> ${pend} ${i18n("sidebar.pending")}` +
    (comp > 0
      ? ` <span class="stat-dot" style="background-color:#94a3b8;"></span> ${comp} ${i18n("sidebar.completed")}`
      : "");

  if (ft.length === 0) {
    $("monthTasksList").innerHTML =
      `<div class="empty-state">` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>` +
      `<p>${i18n("sidebar.empty")}</p></div>`;
    return;
  }

  $("monthTasksList").innerHTML = "";
  ft.forEach((t) => {
    const d = new Date(t.displayDate + "T00:00:00");
    const df = d.toLocaleDateString(getLocale(), { day: "numeric", month: "short" });
    const tc = getTagColor(t.tagId);
    const tn = getTagName(t.tagId);
    const ic = t.completed;

    const card = document.createElement("div");
    card.className = "task-card" + (ic ? " completed" : "");
    card.onclick = () => showTaskDetails(t.id);

    const pc = PRIORITY_COLORS[t.priority || "medium"] || "#f59e0b";
    const repeatIcon =
      t.repeatType && t.repeatType !== "none" ? ' <span class="repeat-icon">\u21BB</span>' : "";
    const searchTerm = getSearchTerm();
    const plabel = t.priority === "high" ? "!!" : t.priority === "low" ? "▾" : "";

    card.innerHTML =
      `<div class="task-priority" style="background-color:${pc}"></div>` +
      `<div class="task-meta" style="color:${tc}">${df}${t.time ? " " + escapeHtml(t.time) : ""}${repeatIcon} · ${escapeHtml(tn)}</div>` +
      `<div class="task-title${ic ? " completed-task" : ""}">` +
      `${plabel ? `<span class="priority-badge" style="background:${pc};color:#fff;">${plabel}</span> ` : ""}${highlightText(t.title, searchTerm)}</div>`;

    // Swipe actions
    let startX = 0, moved = false;
    card.addEventListener("touchstart", (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      moved = false;
    }, { passive: true });
    card.addEventListener("touchmove", (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX;
      if (Math.abs(dx) > 10) moved = true;
      card.style.transform = `translateX(${Math.max(-80, Math.min(80, dx * 0.5))}px)`;
    }, { passive: true });
    card.addEventListener("touchend", (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      card.style.transform = "";
      if (!moved || Math.abs(dx) < 60) return;
      if (dx > 0) {
        // Swipe right → toggle complete
        toggleTaskComplete(t.id, e);
      } else {
        // Swipe left → delete
        if (confirm(i18n("alert.deleteTask"))) {
          deletedTaskIds.push(t.id);
          tasks = tasks.filter((x) => x.id !== t.id);
          saveAllWithUndo();
        }
      }
    });

    $("monthTasksList").appendChild(card);
  });
}

// ── Modals ─────────────────────────────────────────────
function openModal(taskId?: number, prefillDate?: string): void {
  editingTaskId = taskId || null;
  if (taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      $("modalTitle").textContent = "Editar tarea";
      ($("taskTitle") as HTMLInputElement).value = task.title;
      ($("taskDate") as HTMLInputElement).value = task.date;
      ($("taskTime") as HTMLInputElement).value = task.time || "";
      ($("taskDesc") as HTMLTextAreaElement).value = task.description || "";
      ($("taskRepeat") as HTMLSelectElement).value = task.repeatType || "none";
      ($("taskPriority") as HTMLSelectElement).value = task.priority || "medium";
      ($("taskCompleted") as HTMLInputElement).checked = task.completed || false;
      setSelectedTag(task.tagId || (tags.length > 0 ? tags[0].id : null));
    }
  } else {
    $("modalTitle").textContent = "Añadir nueva tarea";
    ($("taskForm") as HTMLFormElement).reset();
    ($("taskRepeat") as HTMLSelectElement).value = "none";
    ($("taskPriority") as HTMLSelectElement).value = "medium";
    ($("taskCompleted") as HTMLInputElement).checked = false;
    setSelectedTag(tags.length > 0 ? tags[0].id : null);
    if (prefillDate) {
      ($("taskDate") as HTMLInputElement).value = prefillDate;
    } else {
      ($("taskDate") as HTMLInputElement).valueAsDate = new Date();
    }
  }
  $("taskModal").classList.remove("hidden");
  setTimeout(() => $("taskModalContent").classList.add("modal-active"), 10);
}

function closeModal(): void {
  $("taskModalContent").classList.remove("modal-active");
  setTimeout(() => {
    $("taskModal").classList.add("hidden");
    editingTaskId = null;
  }, 200);
}

function openDetailModal(taskId: number | null): void {
  currentDetailTaskId = taskId;
  $("detailModal").classList.remove("hidden");
  setTimeout(() => $("detailModalContent").classList.add("modal-active"), 10);
}

function closeDetailModal(): void {
  $("detailModalContent").classList.remove("modal-active");
  setTimeout(() => {
    $("detailModal").classList.add("hidden");
    currentDetailTaskId = null;
  }, 200);
}

function editCurrentTask(): void {
  if (currentDetailTaskId) {
    const id = currentDetailTaskId;
    closeDetailModal();
    setTimeout(() => openModal(id), 250);
  }
}

function toggleTaskComplete(id: number, event: Event): void {
  event.stopPropagation();
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveAllWithUndo();
  }
}

function deleteTask(id: number, event: Event): void {
  event.stopPropagation();
  if (confirm(i18n("alert.deleteTask"))) {
    deletedTaskIds.push(id);
    tasks = tasks.filter((t) => t.id !== id);
    saveAllWithUndo();
  }
}

// ── Completed Filter ───────────────────────────────────
function toggleShowCompleted(): void {
  showCompleted = !showCompleted;
  localStorage.setItem("show_completed", JSON.stringify(showCompleted));
  updateCompletedBtn();
  render();
}

function updateCompletedBtn(): void {
  const btn = $("btnFilterCompleted");
  if (showCompleted) {
    btn.className =
      "px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-1";
  } else {
    btn.className =
      "px-3 py-2 text-xs font-medium text-secondary bg-card border border-slate rounded-lg hover:bg-subtle transition-all flex items-center gap-1";
  }
}

// ── Day/Task Detail Views ──────────────────────────────
function showDayDetails(dateStr: string): void {
  const d = new Date(dateStr + "T00:00:00");
  const fd = d.toLocaleDateString(getLocale(), { day: "numeric", month: "long", year: "numeric" });
  const dt = getTasksForDate(dateStr);
  $("detailTitle").textContent = `Tareas para el ${fd}`;
  $("editBtn").classList.add("hidden");
  if (dt.length === 0) {
    $("detailModalBody").innerHTML =
      `<p class="text-secondary italic">${i18n("modal.detail.empty")}</p>`;
  } else {
    let h = '<div class="space-y-3">';
    dt.forEach((t) => {
      const tc = getTagColor(t.tagId);
      const cc = getContrastColor(tc);
      h +=
        `<div class="p-3 rounded-lg cursor-pointer hover:opacity-80 transition-all" style="background-color:${tc};color:${cc};" onclick="openDetailModal(${t.id})">` +
        `<p class="font-semibold text-sm" style="${t.completed ? "opacity:0.6;text-decoration:line-through;" : ""}">${escapeHtml(t.title)}</p>` +
        `<p class="text-xs opacity-80 mt-1">${t.time ? escapeHtml(t.time) + " - " : ""}${escapeHtml(getTagName(t.tagId))}${t.description ? " - " + escapeHtml(t.description) : ""}</p>` +
        `</div>`;
    });
    h += "</div>";
    $("detailModalBody").innerHTML = h;
  }
  openDetailModal(null);
}

function showTaskDetails(taskId: number): void {
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return;
  const tc = getTagColor(t.tagId);
  const d = new Date(t.date + "T00:00:00");
  const fd = d.toLocaleDateString(getLocale(), { day: "numeric", month: "long", year: "numeric" });
  const cc = getContrastColor(tc);
  const rl: Record<string, string> = { none: "No", daily: "Diario", weekly: "Semanal", monthly: "Mensual" };
  $("detailTitle").textContent = t.title;
  $("editBtn").classList.remove("hidden");
  $("detailModalBody").innerHTML =
    `<div class="space-y-4">` +
    `<div class="p-3 rounded-lg" style="background-color:${tc};color:${cc};"><label class="text-xs opacity-80 uppercase tracking-wider">Fecha y hora</label>` +
    `<p class="font-medium">${fd} - ${t.time ? escapeHtml(t.time) : i18n("value.noTime")}</p>` +
    `<p class="text-xs opacity-70 mt-1">Etiqueta: ${escapeHtml(getTagName(t.tagId))} | Repite: ${rl[t.repeatType] || "No"} | ${t.completed ? i18n("value.completed") : i18n("value.pending")}</p></div>` +
    `<div><label class="text-xs font-bold text-indigo-500 uppercase tracking-wider">Descripción</label>` +
    `<p class="text-primary whitespace-pre-wrap mt-1">${t.description ? escapeHtml(t.description) : i18n("value.noDesc")}</p></div>` +
    `</div>`;
  openDetailModal(taskId);
}

// ── Notifications ──────────────────────────────────────
function toggleNotifications(): void {
  if (!notifyEnabled) {
    if (isNativeApp()) {
      // Capacitor native — request permission + enable
      LocalNotifications.requestPermissions().then((result) => {
        if (result.display === "granted") enableNotifications();
      });
      return;
    }
    if (!("Notification" in window)) {
      alert(i18n("alert.notif.unsupported"));
      return;
    }
    if (Notification.permission === "denied") {
      alert(i18n("alert.notif.denied"));
      return;
    }
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") enableNotifications();
      });
      return;
    }
    enableNotifications();
  } else {
    disableNotifications();
  }
}

function enableNotifications(): void {
  notifyEnabled = true;
  localStorage.setItem("notify_enabled", "true");
  updateNotifyBtn();
  notifyInterval = setInterval(checkNotifications, 30000);
}

function disableNotifications(): void {
  notifyEnabled = false;
  localStorage.setItem("notify_enabled", "false");
  updateNotifyBtn();
  if (notifyInterval) {
    clearInterval(notifyInterval);
    notifyInterval = null;
  }
}

function updateNotifyBtn(): void {
  const btn = $("btnNotify");
  if (notifyEnabled) {
    btn.className =
      "px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-1";
  } else {
    btn.className =
      "px-3 py-2 text-xs font-medium text-secondary bg-card border border-slate rounded-lg hover:bg-subtle transition-all flex items-center gap-1";
  }
}

function checkNotifications(): void {
  if (!notifyEnabled) return;
  if (!isNativeApp() && Notification.permission !== "granted") return;

  const now = new Date();
  const ds = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  tasks.forEach((t) => {
    if (t.time === ts && taskAppliesOnDate(t, ds) && !t.completed) {
      if (isNativeApp()) {
        LocalNotifications.schedule({
          notifications: [{
            id: t.id,
            title: t.title,
            body: t.description || i18n("notif.scheduled"),
            schedule: { at: new Date() },
          }],
        });
      } else {
        new Notification(t.title, { body: t.description || i18n("notif.scheduled") });
      }
    }
  });
}

// ── Export / Import ────────────────────────────────────
function exportTasks(): void {
  const json = JSON.stringify({ tasks, tags }, null, 2);
  if (isNativeApp()) {
    const fileName = `tareas_calendario_${new Date().toISOString().slice(0, 10)}.json`;
    Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    }).then(() => {
      return Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName,
      });
    }).then((uriResult) => {
      Share.share({
        title: "Calendario de Tareas",
        text: "Backup de tareas",
        url: uriResult.uri,
        dialogTitle: "Compartir backup",
      });
    }).catch((err) => {
      console.error("[Export] Error:", err);
      alert("Error al exportar: " + (err.message || ""));
    });
    return;
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tareas_calendario.json";
  a.click();
  URL.revokeObjectURL(url);
}

function exportICal(): void {
  const ics = generateICS(tasks);
  if (isNativeApp()) {
    const fileName = `calendario_${new Date().toISOString().slice(0, 10)}.ics`;
    Filesystem.writeFile({
      path: fileName,
      data: ics,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    }).then(() => {
      return Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName,
      });
    }).then((uriResult) => {
      Share.share({
        title: "Calendario iCal",
        text: "Exportar a calendario",
        url: uriResult.uri,
        dialogTitle: "Exportar iCal",
      });
    }).catch((err) => {
      console.error("[Export iCal] Error:", err);
      alert("Error al exportar iCal: " + (err.message || ""));
    });
    return;
  }
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "calendario_tareas.ics";
  a.click();
  URL.revokeObjectURL(url);
}

function importTasks(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert(i18n("alert.import.size"));
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      let imp: Task[] = Array.isArray(data) ? data : data.tasks || [];
      const impTags: Tag[] = data.tags || [];

      // Validate tasks
      imp = imp.filter(isValidTask);
      if (imp.length === 0) {
        alert(i18n("alert.import.empty"));
        return;
      }

      const merge = confirm(i18n("import.merge"));

      if (merge) {
        const ex: Record<number, boolean> = {};
        tasks.forEach((t) => {
          ex[t.id] = true;
        });
        let added = 0;
        imp.forEach((t) => {
          if (!t.id) t.id = Date.now() + Math.random();
          if (!ex[t.id]) {
            tasks.push(t);
            added++;
          }
        });
        const et: Record<number, boolean> = {};
        tags.forEach((tg) => {
          et[tg.id] = true;
        });
        impTags.forEach((tg) => {
          if (!et[tg.id]) tags.push(tg);
        });
        alert(`Importación completada: ${added} tareas nuevas añadidas.`);
      } else {
        // Track old IDs for cloud deletion
        deletedTaskIds.push(...tasks.map((t) => t.id));
        deletedTagIds.push(...tags.map((t) => t.id));
        tasks = imp;
        if (impTags.length > 0) tags = impTags;
        alert(`Importación completada: ${imp.length} tareas cargadas.`);
      }
      saveAllWithUndo();
    } catch {
      alert(i18n("alert.import.error"));
    }
  };
  reader.readAsText(file);
  input.value = "";
}

// ── Form Submit ────────────────────────────────────────
function handleFormSubmit(e: Event): void {
  e.preventDefault();

  const title = ($("taskTitle") as HTMLInputElement).value.trim();
  const date = ($("taskDate") as HTMLInputElement).value;

  if (!title) {
    ($("taskTitle") as HTMLInputElement).focus();
    ($("taskTitle") as HTMLInputElement).style.borderColor = "#ef4444";
    setTimeout(() => {
      ($("taskTitle") as HTMLInputElement).style.borderColor = "";
    }, 2000);
    return;
  }
  if (!date) {
    ($("taskDate") as HTMLInputElement).focus();
    ($("taskDate") as HTMLInputElement).style.borderColor = "#ef4444";
    setTimeout(() => {
      ($("taskDate") as HTMLInputElement).style.borderColor = "";
    }, 2000);
    return;
  }

  const td: Task = {
    id: editingTaskId || Date.now(),
    title,
    date,
    time: ($("taskTime") as HTMLInputElement).value,
    description: ($("taskDesc") as HTMLTextAreaElement).value.trim(),
    repeatType: ($("taskRepeat") as HTMLSelectElement).value as Task["repeatType"],
    tagId: getSelectedTagId(),
    priority: (($("taskPriority") as HTMLSelectElement)?.value as Task["priority"]) || "medium",
    completed: ($("taskCompleted") as HTMLInputElement).checked,
  };
  if (editingTaskId) {
    const i = tasks.findIndex((t) => t.id === editingTaskId);
    if (i !== -1) tasks[i] = td;
  } else {
    tasks.push(td);
  }
  saveAllWithUndo();
  closeModal();
}

// ── Keyboard Shortcuts ─────────────────────────────────
function showShortcutsModal(): void {
  $("shortcutsModal").classList.remove("hidden");
  setTimeout(() => $("shortcutsContent").classList.add("modal-active"), 10);
}

function closeShortcutsModal(): void {
  $("shortcutsContent").classList.remove("modal-active");
  setTimeout(() => $("shortcutsModal").classList.add("hidden"), 200);
}

function handleKeyDown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    changeView(-1);
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    changeView(1);
  }
  if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    openModal();
  }
  if (e.key === "t" || e.key === "T") {
    e.preventDefault();
    resetToToday();
  }
  if (e.key === "Escape") {
    if (!$("taskModal").classList.contains("hidden")) closeModal();
    if (!$("detailModal").classList.contains("hidden")) closeDetailModal();
    if (!$("tagManagerModal").classList.contains("hidden")) closeTagManager();
    if (!$("shortcutsModal").classList.contains("hidden")) closeShortcutsModal();
  }
  if (e.key === "?") {
    e.preventDefault();
    showShortcutsModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
    e.preventDefault();
    redo();
  }
}

// ── Initialization ─────────────────────────────────────
function init(): void {
  // Task form
  $("taskForm").addEventListener("submit", handleFormSubmit);

  // Import file input
  $("importFile").addEventListener("change", importTasks);

  // Keyboard
  document.addEventListener("keydown", handleKeyDown);

  // Touch fallback
  document.addEventListener("touchend", handleTouchEndGlobal);

  // Swipe gestures for mobile
  let swipeStartX = 0;
  let swipeStartY = 0;
  const calendarArea = $("calendarPanel");
  calendarArea.addEventListener("touchstart", (e: TouchEvent) => {
    if (e.touches.length === 1) {
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
    }
  }, { passive: true });
  calendarArea.addEventListener("touchend", (e: TouchEvent) => {
    if (e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - swipeStartX;
      const dy = e.changedTouches[0].clientY - swipeStartY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        changeView(dx > 0 ? -1 : 1);
      }
    }
  });

  // Language switcher
  const langBtn = document.getElementById("btnLangToggle");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      const next: Lang = getLang() === "es" ? "en" : "es";
      setLang(next);
      applyTranslations();
      persistState();
      render();
    });
  }

  // Apply translations to static HTML
  applyTranslations();

  // Sync icon initial state
  updateSyncIcon();

  // UI state
  initDarkMode();
  updateCompletedBtn();
  updateNotifyBtn();
  renderTagPicker();

  // Notifications
  if (notifyEnabled) {
    if (isNativeApp()) {
      enableNotifications();
    } else if (Notification.permission === "granted") {
      enableNotifications();
    } else {
      notifyEnabled = false;
      updateNotifyBtn();
    }
  }

  // Initial render
  if (viewMode !== "month") setView(viewMode);
  else render();

  // Cloud sync (background, local-first) — full sync on load only
  if (isCloudConfigured()) {
    _syncStatus = "syncing";
    updateSyncIcon();
    fullSync()
      .then(() => { _syncStatus = "synced"; updateSyncIcon(); })
      .catch(() => { _syncStatus = "error"; updateSyncIcon(); });
  }
}

// ── Bootstrap ──────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ── Window exports for inline onclick handlers ─────────
// Needed because .astro components use onclick in HTML attributes
Object.assign(window, {
  setView,
  changeView,
  resetToToday,
  toggleDarkMode,
  openModal,
  closeModal,
  closeDetailModal,
  editCurrentTask,
  openDetailModal,
  toggleTaskComplete,
  deleteTask,
  toggleShowCompleted,
  toggleNotifications,
  openTagManager,
  closeTagManager,
  showShortcutsModal,
  closeShortcutsModal,
  addTag,
  deleteTag,
  exportTasks,
  exportICal,
  importTasks,
  debouncedRender,
  saveAll,
  saveTasks,
  $,
  escapeHtml,
  getSelectedTagId,
  setSelectedTag,
  showDayDetails,
  showTaskDetails,
  render,
  getTagColor,
  getTagName,
  getContrastColor,
  hexToRgba,
  taskAppliesOnDate,
  getTasksForDate,
  copyTask,
  getSearchTerm,
  matchesSearch,
  matchesCompletedFilter,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  renderCalendarCell,
  renderSidebar,
  getWeekTasks,
  getMonthTasks,
  updateCompletedBtn,
  updateNotifyBtn,
  enableNotifications,
  disableNotifications,
  checkNotifications,
  renderTagPicker,
  renderTagList,
  getTag,
  t: i18n,
  setLang,
  getLang,
});
