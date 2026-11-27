# Casos da Lupa

[Versão em português](README.md)

A cooperative deduction game for the browser, for 2 to 6 players (people or bots), 20 to 30 minutes, for all ages (8+). In the first case, the party cake has vanished: the team investigates places, questions suspects and accuses who took the cake and where it is hidden, before 6 PM. Every clue is true.

It runs on phones, tablets, desktops and Smart TVs with a browser, as a PWA.

## Modes

- **One device:** everyone gathers around a tablet or notebook.
- **Table:** a large screen shows the notebook and phones act as controllers. Large screens only (tablet, notebook, TV).
- **Online:** a room with a code, each person on their own device.

First time? The **How to play** button (next to Sound) opens a guided practice game, step by step.

## Levels

Apprentice, Investigator, Expert and Legend. The map and the clock change with the level.

## Accessibility

- Large touch targets (at least 44 px), minimum contrast of 4.5:1 and the whole game playable with the keyboard.
- The state of each suspect and place does not rely on color alone: crossed out with a "ruled out" or "one of 2" tag.
- Clues and the clock are announced to screen readers. Short sentences, for 8-year-olds.
- Short sounds with a "Sound" button on every screen; no sound carries information that is not on the screen.
- Short animations, turned off when the device asks for reduced motion.

Details and measurements in [`docs/quality-checklist.md`](docs/quality-checklist.md) (in Portuguese).

## Status

Stage 6 (polish) done: sounds, animations, accessibility review, easy reading, performance measurements and an "End game" button in every mode. All three modes work (one device, online and table, with the big screen showing the game and phones as controllers, joining by code or QR code), and the game can be installed and played offline in one-device mode. Stage 7 (real games and release) in progress: publishing on Cloudflare is ready and the playtest guide is in `docs/playtests/README.md`. See `docs/ROADMAP.md` (in Portuguese).

## How to run

Requirements: Node 24 (see `.nvmrc`) and pnpm 12.

```bash
pnpm install
pnpm test        # unit and property tests (Vitest + fast-check)
pnpm lint        # ESLint (with the architecture rules) and Prettier
pnpm typecheck   # strict TypeScript in every package
pnpm build       # website (Vite) and Worker (wrangler, without publishing)
pnpm e2e         # end-to-end tests (Playwright + axe-core)
pnpm simulate    # bot simulation: 10,000 mysteries per level and bot (not part of pnpm test)
pnpm simulate:check  # reduced CI simulation: fails if a level misses its target
pnpm --filter @magnifier-cases/web dev      # website in development mode
pnpm dev:online # builds the website and starts the local Cloudflare server: open http://localhost:8787 (online and one device)
pnpm --filter @magnifier-cases/web perf     # performance measurements (6× CPU and 3G; build first)
pnpm cf:deploy   # publishes to Cloudflare by hand (see docs/deploy.md)
```

## Structure

| Folder              | Contents                                                                  |
| ------------------- | ------------------------------------------------------------------------- |
| `packages/engine`   | Rules engine, generator and solver (pure, no I/O)                         |
| `packages/content`  | Theme, clue templates, PT-BR and EN texts and the public name (`appName`) |
| `packages/protocol` | Messages between the device and the server                                |
| `packages/kit`      | Rooms, seats, reconnection, limits and table mode (game-agnostic)         |
| `packages/bots`     | Ideal, casual and random bots (public view only)                          |
| `packages/sim`      | Batch simulation                                                          |
| `apps/web`          | User interface (Svelte 5 + Vite)                                          |
| `apps/server`       | Cloudflare Worker + one Durable Object per room                           |

Dependencies point inwards: the interface and the server depend on the engine, and the engine depends on nothing. ESLint enforces this.

## Documentation

- [Rules](docs/magnifier-cases-rules.md) (Portuguese)
- [Technical specification](docs/magnifier-cases-tech-spec.md) (Portuguese)
- [Roadmap](docs/ROADMAP.md) (Portuguese)
- [Accessibility and performance checklist](docs/quality-checklist.md) (Portuguese)
- [Real-device test](docs/device-test.md) (Portuguese)
- [Simulation reports](docs/simulation/README.md) (Portuguese)
- [Publishing on Cloudflare](docs/deploy.md) (Portuguese)
- [Playtests with people](docs/playtests/README.md) (Portuguese)
- [Instructions for Claude Code](CLAUDE.md) (Portuguese)

## Privacy

No accounts, no chat, no ads and no trackers. The only typed text is the nickname (up to 20 characters), which never goes into logs and disappears when the room expires.

## License

To be defined by the project owner.
