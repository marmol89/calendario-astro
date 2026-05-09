import { chromium } from "playwright";

const URL = "http://localhost:4321";

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 732 }, // 9:16 ratio
    deviceScaleFactor: 2,
    colorScheme: "light",
  });

  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });

  // Clear localStorage for clean state
  await page.evaluate(() => localStorage.clear());

  // Add sample tasks for a realistic look
  await page.evaluate(() => {
    const tasks = [
      { id: 1, title: "Reunión con el equipo", date: "2026-05-10", time: "09:00", description: "Sala de conferencias A", repeatType: "none", tagId: 1, priority: "high", completed: false },
      { id: 2, title: "Comprar víveres", date: "2026-05-10", time: "18:00", description: "Leche, pan, huevos, frutas y verduras", repeatType: "weekly", tagId: 2, priority: "medium", completed: false },
      { id: 3, title: "Enviar informe mensual", date: "2026-05-12", time: "14:00", description: "Revisar métricas de abril antes de enviar", repeatType: "monthly", tagId: 1, priority: "high", completed: false },
      { id: 4, title: "Gimnasio", date: "2026-05-10", time: "07:00", description: "Rutina de piernas", repeatType: "daily", tagId: 5, priority: "medium", completed: true },
      { id: 5, title: "Leer capítulo 5", date: "2026-05-11", time: "21:00", description: "Terminar el libro antes del finde", repeatType: "none", tagId: 4, priority: "low", completed: false },
      { id: 6, title: "Pagar facturas", date: "2026-05-15", time: "", description: "Luz, agua, internet", repeatType: "monthly", tagId: 3, priority: "high", completed: false },
    ];
    const tags = [
      { id: 1, name: "Trabajo", color: "#6366f1" },
      { id: 2, name: "Personal", color: "#10b981" },
      { id: 3, name: "Urgente", color: "#ef4444" },
      { id: 4, name: "Ocio", color: "#f59e0b" },
      { id: 5, name: "Salud", color: "#ec4899" },
    ];
    localStorage.setItem("calendar_tasks", JSON.stringify(tasks));
    localStorage.setItem("calendar_tags", JSON.stringify(tags));
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Screenshot 1: Month view (default)
  await page.screenshot({ path: "./icons/screenshot-01-month.png", fullPage: false });
  console.log("✅ screenshot-01-month.png");

  // Screenshot 2: Week view
  await page.click('button:has-text("Semana")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./icons/screenshot-02-week.png", fullPage: false });
  console.log("✅ screenshot-02-week.png");
  await page.click('button:has-text("Mes")');
  await page.waitForTimeout(300);

  // Screenshot 3: Task modal open
  await page.click('[aria-label="Crear nueva tarea"]');
  await page.waitForTimeout(500);
  await page.fill("#taskTitle", "Nueva tarea de ejemplo");
  await page.screenshot({ path: "./icons/screenshot-03-new-task.png", fullPage: false });
  console.log("✅ screenshot-03-new-task.png");
  await page.click('button:has-text("Cancelar")');
  await page.waitForTimeout(300);

  // Screenshot 4: Dark mode
  await page.click('[aria-label="Cambiar modo oscuro"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./icons/screenshot-04-dark.png", fullPage: false });
  console.log("✅ screenshot-04-dark.png");

  // Screenshot 5: Search active
  await page.click('[aria-label="Cambiar modo oscuro"]'); // back to light
  await page.waitForTimeout(300);
  await page.fill("#searchInput", "reunión");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "./icons/screenshot-05-search.png", fullPage: false });
  console.log("✅ screenshot-05-search.png");
  await page.fill("#searchInput", "");
  await page.waitForTimeout(300);

  // Screenshot 6: Tags manager
  await page.click('[aria-label="Gestionar etiquetas"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./icons/screenshot-06-tags.png", fullPage: false });
  console.log("✅ screenshot-06-tags.png");

  await browser.close();
  console.log("\n🎉 All 6 screenshots generated in icons/");
}

takeScreenshots().catch(console.error);
