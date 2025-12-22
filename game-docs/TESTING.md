# Bomber Royale Testing Guide

This document describes the testing infrastructure for Bomber Royale.

## Test Commands

### Unit Tests (Server)

```bash
# Run all unit tests
npm test

# Run with watch mode (re-runs on file changes)
npm run test:watch --workspace=server

# Run with coverage report
npm run test:coverage
```

### E2E Tests (Client)

Requires the dev server to be running (`npm run dev`).

```bash
# Run headless E2E tests
npm run test:e2e

# Run with browser visible (useful for debugging)
npm run test:e2e:headed --workspace=client

# Run with debug mode (step through tests)
npm run test:e2e:debug --workspace=client
```

### Stress Tests (Bot Games)

Runs simulated bot-only games to test game stability.

```bash
# Run 50 bot games (default)
npm run stress-test

# Run specific number of games
npm run stress-test -- 100

# Run overnight test (1000 games)
npm run stress-test:overnight
```

## Test Structure

### Server Unit Tests (`server/tests/`)

| File | Tests | Description |
|------|-------|-------------|
| `Grid.test.ts` | 18 | Grid generation, spawn zones, walkability |
| `Bomb.test.ts` | 27 | Bomb placement, explosions, chain reactions, kick mechanics |
| `Abilities.test.ts` | 29 | All 9 abilities and their tier upgrades |
| `FogOfWar.test.ts` | 16 | Visibility, line-of-sight, cell memory |
| `ShrinkZone.test.ts` | 13 | Zone shrinking, player damage in zone |
| `Bot.test.ts` | 39 | Pathfinding, danger calculation, bot core functions |

**Total: 142 unit tests**

### E2E Tests (`client/tests/e2e/`)

| File | Tests | Description |
|------|-------|-------------|
| `game.spec.ts` | 8 | Home page, lobby, game flow, controls |

E2E tests cover:
- Creating and joining rooms
- Lobby functionality (ready state, bots)
- Game start with bots
- Leave room functionality

### Stress Test (`server/scripts/stress-test.ts`)

Simulates complete bot-only games to verify:
- Game loop stability (no crashes or hangs)
- Bomb explosions and chain reactions
- Power-up collection
- Shrink zone mechanics
- Bot decision-making

Results include:
- Win rate by personality
- Average game duration
- Error tracking

## Writing New Tests

### Unit Tests

Use Vitest for server tests:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

### E2E Tests

Use Playwright for browser tests:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test('should work correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Title')).toBeVisible();
  });
});
```

## Test Configuration

### Vitest (`server/vitest.config.ts`)

- Environment: Node.js
- Test pattern: `tests/**/*.test.ts`
- Coverage: V8 provider

### Playwright (`client/playwright.config.ts`)

- Browser: Chromium
- Base URL: `http://localhost:5173`
- Automatic server startup on `npm run dev`

## Coverage

Run coverage report:

```bash
npm run test:coverage
```

Coverage output is generated in:
- Console: Text summary
- HTML: `server/coverage/index.html`

## CI/CD Integration

For CI pipelines, use:

```bash
# Unit tests (fast, no browser needed)
npm run test

# E2E tests (requires browser, slower)
npm run test:e2e

# Quick stress test (5 games)
npm run stress-test -- 5
```
