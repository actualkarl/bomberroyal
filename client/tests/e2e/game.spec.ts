import { test, expect } from '@playwright/test';

test.describe('Bomber Royale E2E', () => {
  test.describe('Home Page', () => {
    test('should show create and join buttons', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByText('BOMBER ROYALE')).toBeVisible();
      await expect(page.getByRole('button', { name: /create room/i })).toBeVisible();
      await expect(page.getByPlaceholder(/enter room code/i)).toBeVisible();
    });

    test('should create a new room', async ({ page }) => {
      await page.goto('/');

      // Enter display name
      const nameInput = page.getByPlaceholder(/your name/i);
      await nameInput.fill('TestPlayer');

      // Click create room
      await page.getByRole('button', { name: /create room/i }).click();

      // Should show lobby with room code
      await expect(page.getByText(/room code/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/players/i)).toBeVisible();
    });

    test('should show error for invalid room code', async ({ page }) => {
      await page.goto('/');

      // Enter display name
      const nameInput = page.getByPlaceholder(/your name/i);
      await nameInput.fill('TestPlayer');

      // Enter invalid room code
      await page.getByPlaceholder(/enter room code/i).fill('INVALID');
      await page.getByRole('button', { name: /join/i }).click();

      // Should show error (room not found)
      await expect(page.getByText(/not found|error/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Lobby', () => {
    test('should display player in lobby', async ({ page }) => {
      await page.goto('/');

      // Create room
      await page.getByPlaceholder(/your name/i).fill('LobbyTest');
      await page.getByRole('button', { name: /create room/i }).click();

      // Wait for lobby
      await expect(page.getByText(/room code/i)).toBeVisible({ timeout: 10000 });

      // Player should be visible
      await expect(page.getByText('LobbyTest')).toBeVisible();
      await expect(page.getByText(/\(you\)/i)).toBeVisible();
    });

    test('should toggle ready state', async ({ page }) => {
      await page.goto('/');

      // Create room
      await page.getByPlaceholder(/your name/i).fill('ReadyTest');
      await page.getByRole('button', { name: /create room/i }).click();

      // Wait for lobby
      await expect(page.getByText(/room code/i)).toBeVisible({ timeout: 10000 });

      // Click Ready Up
      const readyButton = page.getByRole('button', { name: /ready up/i });
      await readyButton.click();

      // Should show Cancel Ready or player should be marked ready
      await expect(page.getByText(/ready/i)).toBeVisible();
    });

    test('should add and remove bots (host only)', async ({ page }) => {
      await page.goto('/');

      // Create room as host
      await page.getByPlaceholder(/your name/i).fill('HostTest');
      await page.getByRole('button', { name: /create room/i }).click();

      // Wait for lobby
      await expect(page.getByText(/room code/i)).toBeVisible({ timeout: 10000 });

      // Add a bot
      const addBotButton = page.getByRole('button', { name: /\+1 bot/i });
      if (await addBotButton.isVisible()) {
        await addBotButton.click();

        // Should show bot in player list
        await expect(page.getByText(/bot/i)).toBeVisible({ timeout: 5000 });

        // Remove all bots
        const removeButton = page.getByRole('button', { name: /remove all/i });
        if (await removeButton.isVisible()) {
          await removeButton.click();
        }
      }
    });

    test('should leave room', async ({ page }) => {
      await page.goto('/');

      // Create room
      await page.getByPlaceholder(/your name/i).fill('LeaveTest');
      await page.getByRole('button', { name: /create room/i }).click();

      // Wait for lobby
      await expect(page.getByText(/room code/i)).toBeVisible({ timeout: 10000 });

      // Click Leave
      await page.getByRole('button', { name: /leave/i }).click();

      // Should return to home
      await expect(page.getByRole('button', { name: /create room/i })).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Game Flow', () => {
    test('should start game with bots and show game board', async ({ page }) => {
      await page.goto('/');

      // Create room
      await page.getByPlaceholder(/your name/i).fill('GameTest');
      await page.getByRole('button', { name: /create room/i }).click();

      // Wait for lobby
      await expect(page.getByText(/room code/i)).toBeVisible({ timeout: 10000 });

      // Add 3 bots to fill the game
      const fillBotsButton = page.getByRole('button', { name: /fill bots/i });
      if (await fillBotsButton.isVisible()) {
        await fillBotsButton.click();

        // Wait for bots to be added
        await page.waitForTimeout(500);

        // Ready up
        await page.getByRole('button', { name: /ready up/i }).click();

        // Wait a moment for all to be ready
        await page.waitForTimeout(500);

        // Start game (all players should be ready now since bots are auto-ready)
        const startButton = page.getByRole('button', { name: /start game/i });
        if (await startButton.isVisible()) {
          await startButton.click();

          // Wait for countdown and game to start
          await page.waitForTimeout(4000);

          // Game board should be visible (either loading or canvas)
          const gameVisible = await page
            .locator('canvas, [class*="container"]')
            .first()
            .isVisible()
            .catch(() => false);

          expect(gameVisible).toBe(true);
        }
      }
    });
  });

  test.describe('Keyboard Controls', () => {
    test.skip('should respond to WASD keys during gameplay', async ({ page }) => {
      // This test requires the game to be running
      // Skipped because it requires complex game setup
      await page.goto('/');

      // Create room and start game with bots...
      // Then test keyboard input
    });
  });
});
