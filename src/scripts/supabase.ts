import { createClient } from "@supabase/supabase-js";
import type { Task, Tag } from "./utils";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const isConfigured = (): boolean => !!(supabaseUrl && supabaseAnonKey);

// ── Auth: reuse existing anonymous session ──────────────
export async function ensureSession(): Promise<string | null> {
  if (!isConfigured()) return null;

  // Try to restore existing session from localStorage
  const saved = localStorage.getItem("supabase_session");
  if (saved) {
    try {
      const { data } = await supabase.auth.setSession(JSON.parse(saved));
      if (data.session?.user) {
        return data.session.user.id;
      }
    } catch { /* expired, will sign in again */ }
  }

  // No saved session — create anonymous one and persist it
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    console.warn("[Sync] Auth failed:", error?.message);
    return null;
  }

  return data.user.id;
}

// Listen for session changes and persist
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    localStorage.setItem("supabase_session", JSON.stringify(session));
  } else {
    localStorage.removeItem("supabase_session");
  }
});

// ── Sync: Pull from cloud ──────────────────────────────
export async function pullFromCloud(userId: string): Promise<{
  tasks: Task[];
  tags: Tag[];
} | null> {
  if (!isConfigured()) return null;

  const [tasksRes, tagsRes] = await Promise.all([
    supabase.from("tasks").select("*").eq("user_id", userId),
    supabase.from("tags").select("*").eq("user_id", userId),
  ]);

  if (tasksRes.error || tagsRes.error) {
    console.warn("[Sync] Pull error:", tasksRes.error || tagsRes.error);
    return null;
  }

  return {
    tasks: (tasksRes.data || []).map(mapTaskFromDB),
    tags: tagsRes.data || [],
  };
}

// ── Sync: Push to cloud ────────────────────────────────
export async function pushToCloud(
  userId: string,
  tasks: Task[],
  tags: Tag[],
  deletedTaskIds: number[] = [],
  deletedTagIds: number[] = []
): Promise<boolean> {
  if (!isConfigured()) return false;

  const dbTasks = tasks.map(mapTaskToDB).map((t) => ({ ...t, user_id: userId }));
  const dbTags = tags.map(mapTagToDB).map((t) => ({ ...t, user_id: userId }));

  const results = await Promise.all([
    dbTasks.length > 0 ? supabase.from("tasks").upsert(dbTasks, { onConflict: "id" }) : null,
    dbTags.length > 0 ? supabase.from("tags").upsert(dbTags, { onConflict: "id" }) : null,
    ...deletedTaskIds.map((id) =>
      supabase.from("tasks").delete().eq("id", id).eq("user_id", userId)
    ),
    ...deletedTagIds.map((id) =>
      supabase.from("tags").delete().eq("id", id).eq("user_id", userId)
    ),
  ]);

  let ok = true;
  for (const res of results) {
    if (res?.error) {
      console.warn("[Sync] Push error:", res.error);
      ok = false;
    }
  }
  return ok;
}

// ── Helpers ────────────────────────────────────────────
function mapTaskToDB(t: Task): Record<string, any> {
  return {
    id: t.id,
    title: t.title,
    date: t.date,
    time: t.time,
    description: t.description,
    repeat_type: t.repeatType,
    tag_id: t.tagId,
    priority: (t as any).priority || "medium",
    completed: t.completed,
    updated_at: new Date().toISOString(),
  };
}

function mapTagToDB(t: Tag): Record<string, any> {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    updated_at: new Date().toISOString(),
  };
}

function mapTaskFromDB(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time || "",
    description: row.description || "",
    repeatType: row.repeat_type || "none",
    tagId: row.tag_id || null,
    priority: row.priority || "medium",
    completed: row.completed || false,
  };
}
