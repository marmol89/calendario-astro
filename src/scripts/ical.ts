// iCal (RFC 5545) export for calendar apps

function escapeICS(text: string): string {
  return text.replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
}

function formatICSDate(dateStr: string, timeStr?: string): string {
  const d = dateStr.replace(/-/g, "");
  if (timeStr) {
    const t = timeStr.replace(/:/g, "") + "00";
    return d + "T" + t;
  }
  return d;
}

export function generateICS(tasks: Array<{
  title: string;
  date: string;
  time?: string;
  description?: string;
  repeatType?: string;
}>): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calendario de Tareas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  tasks.forEach((t) => {
    const dtStart = formatICSDate(t.date, t.time);
    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`SUMMARY:${escapeICS(t.title)}`);
    if (t.description) lines.push(`DESCRIPTION:${escapeICS(t.description)}`);
    if (t.repeatType === "daily") lines.push("RRULE:FREQ=DAILY");
    if (t.repeatType === "weekly") lines.push("RRULE:FREQ=WEEKLY");
    if (t.repeatType === "monthly") lines.push("RRULE:FREQ=MONTHLY");
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(tasks: Array<{
  title: string;
  date: string;
  time?: string;
  description?: string;
  repeatType?: string;
}>): void {
  const ics = generateICS(tasks);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "calendario_tareas.ics";
  a.click();
  URL.revokeObjectURL(url);
}
