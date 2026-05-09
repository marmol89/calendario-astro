type Lang = "es" | "en";

type Translations = Record<string, Record<Lang, string>>;

const dict: Translations = {
  // Header
  "app.title": { es: "Calendario de Tareas", en: "Task Calendar" },
  "app.subtitle": { es: "Gestiona tus actividades diarias", en: "Manage your daily activities" },
  "view.month": { es: "Mes", en: "Month" },
  "view.week": { es: "Semana", en: "Week" },
  "view.day": { es: "Día", en: "Day" },
  "nav.previous": { es: "Ant", en: "Prev" },
  "nav.next": { es: "Sig", en: "Next" },
  "nav.today": { es: "Hoy", en: "Today" },
  "nav.darkMode": { es: "Cambiar modo oscuro", en: "Toggle dark mode" },
  "search.placeholder": { es: "Buscar tareas...", en: "Search tasks..." },
  "search.label": { es: "Buscar tareas", en: "Search tasks" },
  "btn.notify": { es: "Notificar", en: "Notify" },
  "btn.notify.label": { es: "Activar notificaciones", en: "Enable notifications" },
  "btn.showCompleted": { es: "Mostrar completadas", en: "Show completed" },
  "btn.showCompleted.label": { es: "Mostrar tareas completadas", en: "Show completed tasks" },
  "btn.tags": { es: "Etiquetas", en: "Tags" },
  "btn.tags.label": { es: "Gestionar etiquetas", en: "Manage tags" },
  "btn.export": { es: "Exportar", en: "Export" },
  "btn.export.label": { es: "Exportar tareas a JSON", en: "Export tasks to JSON" },
  "btn.import": { es: "Importar", en: "Import" },
  "btn.import.label": { es: "Importar tareas desde JSON", en: "Import tasks from JSON" },
  "btn.newTask": { es: "Nueva Tarea", en: "New Task" },
  "btn.newTask.label": { es: "Crear nueva tarea", en: "Create new task" },
  "btn.shortcuts": { es: "Atajos", en: "Shortcuts" },
  "btn.shortcuts.label": { es: "Mostrar atajos de teclado", en: "Show keyboard shortcuts" },

  // Sidebar
  "sidebar.tasks": { es: "Tareas", en: "Tasks" },
  "sidebar.day": { es: "Tareas del Día", en: "Today's Tasks" },
  "sidebar.week": { es: "Tareas de la Semana", en: "Week's Tasks" },
  "sidebar.month": { es: "Tareas del Mes", en: "Month's Tasks" },
  "sidebar.pending": { es: "pendientes", en: "pending" },
  "sidebar.completed": { es: "completadas", en: "completed" },
  "sidebar.empty": { es: "No hay tareas para este periodo.", en: "No tasks for this period." },

  // Modal: Task
  "modal.task.new": { es: "Añadir nueva tarea", en: "Add new task" },
  "modal.task.edit": { es: "Editar tarea", en: "Edit task" },
  "modal.task.title": { es: "Título", en: "Title" },
  "modal.task.date": { es: "Fecha", en: "Date" },
  "modal.task.time": { es: "Hora", en: "Time" },
  "modal.task.repeat": { es: "Repetir", en: "Repeat" },
  "modal.task.desc": { es: "Descripción", en: "Description" },
  "modal.task.tag": { es: "Etiqueta", en: "Tag" },
  "modal.task.completed": { es: "Marcar como completada", en: "Mark as completed" },
  "modal.task.cancel": { es: "Cancelar", en: "Cancel" },
  "modal.task.save": { es: "Guardar", en: "Save" },

  // Modal: Detail
  "modal.detail.title": { es: "Detalles", en: "Details" },
  "modal.detail.edit": { es: "Editar", en: "Edit" },
  "modal.detail.close": { es: "Cerrar", en: "Close" },
  "modal.detail.dateTime": { es: "Fecha y hora", en: "Date and time" },
  "modal.detail.tag": { es: "Etiqueta", en: "Tag" },
  "modal.detail.repeat": { es: "Repite", en: "Repeats" },
  "modal.detail.desc": { es: "Descripción", en: "Description" },
  "modal.detail.empty": { es: "No hay tareas para este día.", en: "No tasks for this day." },

  // Modal: Tags
  "modal.tags.title": { es: "Gestionar Etiquetas", en: "Manage Tags" },
  "modal.tags.name": { es: "Nombre Etiqueta", en: "Tag Name" },
  "modal.tags.add": { es: "Añadir", en: "Add" },
  "modal.tags.close": { es: "Cerrar", en: "Close" },
  "modal.tags.delete": { es: "Eliminar", en: "Delete" },

  // Modal: Shortcuts
  "modal.shortcuts.title": { es: "Atajos de Teclado", en: "Keyboard Shortcuts" },
  "modal.shortcuts.prev": { es: "Periodo anterior", en: "Previous period" },
  "modal.shortcuts.next": { es: "Periodo siguiente", en: "Next period" },
  "modal.shortcuts.today": { es: "Ir a hoy", en: "Go to today" },
  "modal.shortcuts.new": { es: "Nueva tarea", en: "New task" },
  "modal.shortcuts.close": { es: "Cerrar modal", en: "Close modal" },

  // Values
  "repeat.none": { es: "No Repetir", en: "No Repeat" },
  "repeat.daily": { es: "Diario", en: "Daily" },
  "repeat.weekly": { es: "Semanal", en: "Weekly" },
  "repeat.monthly": { es: "Mensual", en: "Monthly" },
  "value.noTag": { es: "Sin etiqueta", en: "No tag" },
  "value.noTime": { es: "Sin hora", en: "No time" },
  "value.noDesc": { es: "Sin descripción", en: "No description" },
  "value.completed": { es: "Completada", en: "Completed" },
  "value.pending": { es: "Pendiente", en: "Pending" },

  // App meta
  "app.description": { es: "Organiza tus actividades diarias con etiquetas, repeticiones y recordatorios.", en: "Organize your daily activities with tags, repeats and reminders." },

  // Calendar days
  "day.mon": { es: "Lun", en: "Mon" },
  "day.tue": { es: "Mar", en: "Tue" },
  "day.wed": { es: "Mié", en: "Wed" },
  "day.thu": { es: "Jue", en: "Thu" },
  "day.fri": { es: "Vie", en: "Fri" },
  "day.sat": { es: "Sáb", en: "Sat" },
  "day.sun": { es: "Dom", en: "Sun" },

  // Modal: Task form labels
  "form.title": { es: "Título", en: "Title" },
  "form.date": { es: "Fecha", en: "Date" },
  "form.time": { es: "Hora", en: "Time" },
  "form.repeat": { es: "Repetir", en: "Repeat" },
  "form.description": { es: "Descripción", en: "Description" },
  "form.tag": { es: "Etiqueta", en: "Tag" },
  "form.completed": { es: "Marcar como completada", en: "Mark as completed" },

  // Modal: Detail
  "detail.dateTime": { es: "Fecha y hora", en: "Date and time" },
  "detail.tag": { es: "Etiqueta", en: "Tag" },
  "detail.repeat": { es: "Repite", en: "Repeats" },
  "detail.description": { es: "Descripción", en: "Description" },
  "detail.tasksFor": { es: "Tareas para el", en: "Tasks for" },

  // Shortcuts modal
  "shortcuts.prev": { es: "Periodo anterior", en: "Previous period" },
  "shortcuts.next": { es: "Periodo siguiente", en: "Next period" },
  "shortcuts.today": { es: "Ir a hoy", en: "Go to today" },
  "shortcuts.new": { es: "Nueva tarea", en: "New task" },
  "shortcuts.close": { es: "Cerrar modal", en: "Close modal" },
  "shortcuts.help": { es: "Mostrar esta ayuda", en: "Show this help" },

  // Misc
  "tag.name": { es: "Nombre Etiqueta", en: "Tag Name" },
  "tag.add": { es: "Añadir", en: "Add" },
  "tag.delete": { es: "Eliminar", en: "Delete" },
  "tag.manager": { es: "Gestionar Etiquetas", en: "Manage Tags" },
  "import.merge": { es: "¿Fusionar con tareas actuales? (Cancelar = reemplazar)", en: "Merge with current tasks? (Cancel = replace)" },
  "import.found": { es: "Se encontraron {n} tareas. ¿Fusionar con las actuales? (Cancelar = reemplazar)", en: "Found {n} tasks. Merge with current ones? (Cancel = replace)" },
  "import.added": { es: "Importación completada: {n} tareas nuevas añadidas.", en: "Import completed: {n} new tasks added." },
  "import.loaded": { es: "Importación completada: {n} tareas cargadas.", en: "Import completed: {n} tasks loaded." },
  "notif.scheduled": { es: "Tienes una tarea programada", en: "You have a scheduled task" },

  // Priority
  "priority.high": { es: "Alta", en: "High" },
  "priority.medium": { es: "Media", en: "Medium" },
  "priority.low": { es: "Baja", en: "Low" },
  "form.priority": { es: "Prioridad", en: "Priority" },
  "btn.ical": { es: "iCal", en: "iCal" },
  "btn.ical.label": { es: "Exportar a iCalendar (.ics)", en: "Export to iCalendar (.ics)" },

  // Sync
  "sync.offline": { es: "Offline — datos solo locales", en: "Offline — local data only" },
  "sync.online": { es: "Sincronizado en la nube", en: "Synced to cloud" },
  "sync.synced": { es: "Sincronizado", en: "Synced" },
  "sync.syncing": { es: "Sincronizando...", en: "Syncing..." },
  "sync.error": { es: "Error de sync", en: "Sync error" },
  "btn.lang.label": { es: "Cambiar idioma", en: "Switch language" },

  // Alerts
  "alert.notif.unsupported": { es: "Tu navegador no soporta notificaciones.", en: "Your browser doesn't support notifications." },
  "alert.notif.denied": { es: "Permiso denegado.", en: "Permission denied." },
  "alert.minTags": { es: "Necesitas al menos una etiqueta.", en: "You need at least one tag." },
  "alert.deleteTag": { es: "¿Eliminar esta etiqueta?", en: "Delete this tag?" },
  "alert.deleteTask": { es: "¿Eliminar esta tarea?", en: "Delete this task?" },
  "alert.import.error": { es: "Error al leer el archivo. Asegurate de que sea un JSON válido.", en: "Error reading file. Make sure it's valid JSON." },
  "alert.import.empty": { es: "No se encontraron tareas válidas en el archivo.", en: "No valid tasks found in the file." },
  "alert.import.size": { es: "El archivo es demasiado grande (máximo 5 MB).", en: "File is too large (max 5 MB)." },
  "alert.renderError": { es: "Error al mostrar el calendario. Intentá recargar la página.", en: "Error displaying calendar. Try reloading the page." },
};

let currentLang: Lang = (localStorage.getItem("lang") as Lang) || "es";

export function t(key: string): string {
  const entry = dict[key];
  if (!entry) {
    console.warn(`[i18n] Missing translation: ${key}`);
    return key;
  }
  return entry[currentLang] || entry["es"] || key;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyTranslations();
}

export function getLang(): Lang {
  return currentLang;
}

export function applyTranslations(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) (el as HTMLInputElement).placeholder = t(key);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
  // Update <title> tag
  const titleEl = document.querySelector("title");
  if (titleEl) titleEl.textContent = t("app.title");
  // Update meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", t("app.description"));
  // Update manifest theme
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", "#6366f1");
}

// Re-export for type
export type { Lang };
