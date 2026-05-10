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

export async function downloadICS(tasks: Array<{
  title: string;
  date: string;
  time?: string;
  description?: string;
  repeatType?: string;
}>): Promise<void> {
  const ics = generateICS(tasks);
  const fileName = "calendario_tareas.ics";
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });

  // Try Web Share API first (works on mobile browsers + supports file sharing on iOS 14+)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: "text/calendar" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "Calendario iCal",
          text: "Exportar a calendario",
          files: [file],
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to download
      }
    }
  }

  // Fallback: force download via anchor element
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Delay revocation to let the browser start the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}
