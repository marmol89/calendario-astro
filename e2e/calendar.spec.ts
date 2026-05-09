import { test, expect } from "@playwright/test";

test.describe("Calendario de Tareas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear localStorage for clean state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("renders the calendar with month view by default", async ({ page }) => {
    await expect(page.locator("#calendarGrid")).toBeVisible();
    await expect(page.locator("#monthDisplay")).toContainText(/2026/);
  });

  test("can navigate between months with arrow buttons", async ({ page }) => {
    const monthBefore = await page.locator("#monthDisplay").textContent();
    await page.click('[aria-label="Siguiente"]');
    await page.waitForTimeout(300);
    const monthAfter = await page.locator("#monthDisplay").textContent();
    expect(monthAfter).not.toBe(monthBefore);

    await page.click('[aria-label="Anterior"]');
    await page.waitForTimeout(300);
    const monthBack = await page.locator("#monthDisplay").textContent();
    expect(monthBack).toBe(monthBefore);
  });

  test("can create a new task", async ({ page }) => {
    await page.click('[aria-label="Crear nueva tarea"]');
    await expect(page.locator("#taskModal")).toBeVisible();

    await page.fill("#taskTitle", "Test Task E2E");
    await page.fill("#taskDate", "2026-05-15");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(300);
    // Task should appear in the sidebar
    await expect(page.locator("#monthTasksList")).toContainText("Test Task E2E");
  });

  test("can switch to week and day views", async ({ page }) => {
    await page.click('button:has-text("Semana")');
    await page.waitForTimeout(300);
    await expect(page.locator("#sidebarTitleText")).toContainText("Semana");

    await page.click('button:has-text("Día")');
    await page.waitForTimeout(300);
    await expect(page.locator("#sidebarTitleText")).toContainText("Día");

    await page.click('button:has-text("Mes")');
    await page.waitForTimeout(300);
    await expect(page.locator("#sidebarTitleText")).toContainText("Mes");
  });

  test("can search tasks", async ({ page }) => {
    // Create a task first
    await page.click('[aria-label="Crear nueva tarea"]');
    await page.fill("#taskTitle", "Comprar pan");
    await page.fill("#taskDate", "2026-05-20");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);

    // Search for it
    await page.fill("#searchInput", "pan");
    await page.waitForTimeout(500);

    await expect(page.locator("#monthTasksList")).toContainText("Comprar pan");

    // Search for something that doesn't exist
    await page.fill("#searchInput", "xyznotfound");
    await page.waitForTimeout(500);
    await expect(page.locator("#monthTasksList")).not.toContainText("Comprar pan");
  });

  test("can toggle dark mode", async ({ page }) => {
    await page.click('[aria-label="Cambiar modo oscuro"]');
    await page.waitForTimeout(300);
    const isDark = await page.evaluate(() => document.body.classList.contains("dark"));
    expect(isDark).toBe(true);

    await page.click('[aria-label="Cambiar modo oscuro"]');
    await page.waitForTimeout(300);
    const isLight = await page.evaluate(() => !document.body.classList.contains("dark"));
    expect(isLight).toBe(true);
  });

  test("can open keyboard shortcuts modal with ? key", async ({ page }) => {
    await page.keyboard.press("?");
    await expect(page.locator("#shortcutsModal")).toBeVisible();
  });

  test("can switch language", async ({ page }) => {
    // Create a task to see dynamic strings
    await page.click('[aria-label="Crear nueva tarea"]');
    await page.fill("#taskTitle", "Language Test");
    await page.fill("#taskDate", "2026-05-10");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);

    // Click language toggle
    await page.click("#btnLangToggle");
    await page.waitForTimeout(500);

    // Check that sidebar stats are in English
    const statsText = await page.locator("#sidebarStats").textContent();
    expect(statsText).toMatch(/pending|completed/i);
    expect(statsText).not.toMatch(/pendientes|completadas/i);
  });

  test("shows bottom nav on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    await expect(page.locator(".mobile-nav")).toBeVisible();
  });

  test("can undo deletion with Ctrl+Z", async ({ page }) => {
    // Create a task
    await page.click('[aria-label="Crear nueva tarea"]');
    await page.fill("#taskTitle", "Task to Undo");
    await page.fill("#taskDate", "2026-05-10");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);

    // Delete it via sidebar hover button
    const taskCards = page.locator("#monthTasksList > div");
    const countBefore = await taskCards.count();
    const firstCard = taskCards.first();
    await firstCard.hover();
    // Click the X button (first button in the card)
    await firstCard.locator("button").first().click();
    await page.waitForTimeout(100);

    // Handle confirm dialog
    page.once("dialog", (dialog) => dialog.accept());
    await page.waitForTimeout(300);

    // Now undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(500);

    const countAfter = await page.locator("#monthTasksList > div").count();
    expect(countAfter).toBe(countBefore);
  });

  test("navigates to today with T key", async ({ page }) => {
    await page.keyboard.press("t");
    await page.waitForTimeout(300);
    const today = new Date();
    const monthYear = await page.locator("#monthDisplay").textContent();
    const expectedMonth = today.toLocaleDateString("es-ES", { month: "long" });
    expect(monthYear).toContain(expectedMonth);
  });
});
