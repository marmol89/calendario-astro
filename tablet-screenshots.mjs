import { chromium } from "playwright";

const URL = "http://localhost:4321";

async function takeTabletScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, // 10-inch tablet 16:9
    deviceScaleFactor: 2,
    colorScheme: "light",
  });

  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });

  // Clear localStorage for clean state
  await page.evaluate(() => localStorage.clear());

  // Add sample tasks
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
  await page.waitForTimeout(1500);

  // Screenshot 1: Month view tablet landscape
  await page.screenshot({ path: "./icons/tablet10-01-month.png", fullPage: false });
  console.log("✅ tablet10-01-month.png");

  await page.click('button:has-text("Semana")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./icons/tablet10-02-week.png", fullPage: false });
  console.log("✅ tablet10-02-week.png");
  await page.click('button:has-text("Mes")');
  await page.waitForTimeout(300);

  // Screenshot 3: Task details (click a task)
  const taskCards = page.locator("#monthTasksList > div");
  const count = await taskCards.count();
  if (count > 0) {
    await taskCards.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "./icons/tablet10-03-detail.png", fullPage: false });
    console.log("✅ tablet10-03-detail.png");
    await page.click('button:has-text("Cerrar")');
    await page.waitForTimeout(300);
  }

  // Screenshot 4: Dark mode tablet
  await page.click('[aria-label="Cambiar modo oscuro"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./icons/tablet10-04-dark.png", fullPage: false });
  console.log("✅ tablet10-04-dark.png");
  await page.click('[aria-label="Cambiar modo oscuro"]');
  await page.waitForTimeout(300);

  // Screenshot 5: Search with highlight
  await page.fill("#searchInput", "reunión");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "./icons/tablet10-05-search.png", fullPage: false });
  console.log("✅ tablet10-05-search.png");
  await page.fill("#searchInput", "");
  await page.waitForTimeout(300);

  // Screenshot 6: New task modal tablet
  await page.click('[aria-label="Crear nueva tarea"]');
  await page.waitForTimeout(500);
  await page.fill("#taskTitle", "Planificar sprint");
  await page.screenshot({ path: "./icons/tablet10-06-new-task.png", fullPage: false });
  console.log("✅ tablet10-06-new-task.png");
  await page.click('button:has-text("Cancelar")');
  await page.waitForTimeout(300);

  // Screenshot 7: Keyboard shortcuts
  await page.keyboard.press("?");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./icons/tablet10-07-shortcuts.png", fullPage: false });
  console.log("✅ tablet10-07-shortcuts.png");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // Screenshot 8: Tags manager tablet
  await page.click('[aria-label="Gestionar etiquetas"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: "./icons/tablet10-08-tags.png", fullPage: false });
  console.log("✅ tablet10-08-tags.png");

  await browser.close();
  console.log("\n🎉 All 8 tablet 10-inch screenshots generated in icons/");
}

takeTabletScreenshots().catch(console.error);
