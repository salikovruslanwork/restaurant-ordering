# Restaurant Ordering — Real-time Prototype

Two Angular apps and a NestJS server, kept in sync with Server-Sent Events.

- **Menu** (http://localhost:4400): browse the menu, add dishes to the cart (with your own price for open-price dishes), apply a discount, check out and follow your orders live.
- **Admin** (http://localhost:4401): manage categories and dishes (price, availability, open price) and move orders through their statuses.

Every change in Admin shows up in the Menu right away, and every new order or status change shows up in both.

---

## How to run

Requirements: Node.js 26 (see `.nvmrc`). Nothing else: no database, no Docker.

```bash
npm install
npm start
```

| App             | URL                       |
| --------------- | ------------------------- |
| Menu (customer) | http://localhost:4400     |
| Admin           | http://localhost:4401     |
| Server API      | http://localhost:4500/api |

`npm start` runs the development servers. They serve unminified code (about 10 MB of JS), so to judge speed, for example on Slow 4G, use the production build instead:

```bash
npm run start:prod
```

It builds everything and serves the minified apps on the same ports, with gzip and long-term caching (about 160 KB of JS on the first load).

Other scripts:

| Command                                      | What it does                                               |
| -------------------------------------------- | ---------------------------------------------------------- |
| `npm run start:back` / `npm run start:front` | only the server / only the two apps                        |
| `npm run start:fresh`                        | deletes the saved data and starts again from the mock data |
| `npm run start:empty`                        | replaces the saved data with an empty menu and starts      |
| `npm run reset:data`                         | only deletes the saved data                                |
| `npm run clear:data`                         | only replaces the saved data with an empty menu            |
| `npm test`                                   | all tests (Vitest)                                         |
| `npm run lint`                               | ESLint and Stylelint                                       |
| `npm run build`                              | production builds of the contracts, server and both apps   |
| `npm run format:check`                       | Prettier                                                   |

Data is saved to `server/data/db.json`. When that file is missing, the server starts from the mock data in `server/data/seed.json`: 25 categories with 25 dishes each, some of them open-price and some unavailable.

### Project structure

```
contracts/   @restaurant/contracts: API types and string enums shared by the server and both apps
server/      NestJS: menu, orders, idempotency and event modules
web/         Angular CLI workspace
  projects/menu     customer app
  projects/admin    staff app
  projects/shared   ui (components around Angular Material), data-access (API, SSE, NgRx), util
```

---

## Key decisions and trade-offs

**Two apps in one Angular CLI workspace, with npm workspaces instead of Nx.** Customers never download admin code, and the two apps could be deployed and secured separately. Standard tools only keep the repository easy to read. The cost: shared code has to live in a library, path aliases and import boundaries (enforced with ESLint) are set up by hand, and there is no build cache.

**Own components around Angular Material.** The apps use our wrappers (`app-button`, `app-text-field`, `app-dialog`, …) and never import Material directly, so the look and the API stay consistent and the UI library could be replaced. The cost is about a dozen extra small components, and any new Material feature has to be exposed by a wrapper first.

**SCSS with BEM, on top of Angular's style encapsulation.** Predictable class names and safe dialog styles; Material is customised only through its theming APIs. Stylelint enforces the naming.

**Classic NgRx (Store, Effects, Entity).** Effects suit an event stream and a multi-step checkout, and the data flow is explicit and easy to test. It costs more boilerplate than SignalStore. Components read the store through signals.

**The full menu is loaded once.** Category filtering is instant and live updates are simple. The list is rendered with CDK virtual scroll, so thousands of dishes stay smooth (checked with 5,000 dishes on a 6× slower CPU). This doesn't scale to huge catalogues.

**Fast first paint.** The header and cart appear with the first bundle; the dish list loads in a `@defer` block next to the menu request, with skeletons of the same size, so nothing shifts. Dialogs are loaded when opened, REST responses are gzipped (but not the event streams, which gzip would buffer), and only the icons in use are downloaded from the icon font.

**Different reactions to a lost connection.** Admin turns read-only while offline or reconnecting, and a banner says why. Customers don't see connection trouble at all: browsing and the cart keep working offline, and they only meet a problem when a request fails, with a clear message and "Try again". The cart is saved to localStorage on every change and restored on start, so it survives a page reload, a lost connection or a server that is down.

**Live warnings in the cart.** Cart lines remember the price the customer saw. A selector compares them with the live menu, so price changes, unavailable dishes and removed dishes are flagged as soon as the event arrives, even after a reconnect, and the customer is told before confirming.

**Optimistic order statuses, non-optimistic menu edits.** A status change in Admin shows at once and rolls back on an error; every request carries `expectedVersion`, so two staff members changing one order get `409` and the UI shows the latest state. Menu edits wait for the server instead, because forms must show its validation errors.

**A shared contracts package.** API shapes and fixed values (order statuses, event types, error codes) are defined once, as types and string enums, and used by the server and both apps. It needs a small `tsc` build before anything starts, and the server's validation DTOs still repeat the shapes (they `implement` the contract types, so the compiler catches drift).

**SSE for updates, REST for actions.** Updates only flow from the server to the browser, so Server-Sent Events are enough: reconnecting and `Last-Event-ID` are built into the browser, and no client library is needed. Every event has a global `seq`; snapshots (`GET /api/menu`, the order lists) include the current `seq`, the stream starts from it, and after a reconnect the server replays what was missed or tells the app to reload (`resync`). There are two streams, so a customer never receives other people's orders. The cost is the replay buffer and the filtering on the server.

**Checkout that can't create an order twice.** Each attempt sends an `Idempotency-Key`; the server stores key → result, so a retried request returns the same order. On the client, `exhaustMap` and a disabled button stop double clicks. If the connection drops, there is no automatic retry: the dialog says the order couldn't be confirmed, and "Try again" reuses the same key. The key and the cart stay in localStorage until the server answers, so even a page reload doesn't create a second order. The server checks every line again (availability, current price, open-price limits, discount cap) and answers `409 MENU_CHANGED` with a list of changes, which the dialog shows before the customer confirms again.

**Money in integer cents.** No rounding errors; `Intl` formats it for display.

**Data in memory, saved to a JSON file.** The project runs with one command and nothing to install, data survives a restart, and one command resets it. The whole file is rewritten after changes, and only one server instance can run.

---

## What I deliberately simplified

- No authentication or roles. Customers are identified by an anonymous `clientId` stored in the browser, which is enough for "My orders" but not secure.
- One restaurant; data in memory, saved to a JSON file. The event log and the idempotency keys live only in memory, without expiry, and are lost on restart.
- Payments are simulated: placing an order is the last step.
- The customer types the discount amount.
- No photos: every dish shows an illustrated placeholder of a fixed size.
- No server-side rendering and no service worker, so a screen that was never opened can't be opened offline.
- A connection that a proxy drops silently isn't noticed until a request fails, because `EventSource` hides the server's heartbeat comments. Reconnect backoff grows to 30 seconds.
- The admin order list isn't virtualised; a day of a prototype restaurant has tens or hundreds of orders.

---

## What would be needed for production

### Frontend

- A service worker that precaches the app shell for offline use.
- Server-side rendering for the menu app, if needed.
- A named heartbeat event, so the client notices a silently dropped connection.
- Promo codes instead of a free discount amount.
- Dish photos instead of the placeholders.
- Drag and drop to reorder categories.
- End-to-end tests (Playwright).
- Separate deployments for the two apps.
- i18n, with a different approach to UI strings: almost all of them moved out of the configs and TS files.
- A fully responsive admin app: only large desktop and mobile are covered for now, not every size in between.

### Server and infrastructure

- Authentication and roles for staff and customers.
- A database with migrations, and a persistent idempotency store with expiry.
- Redis pub/sub (or similar), so several server instances share one event stream.
- Image storage, resizing and a CDN for the photos.
- Rate limiting, logging and monitoring.
- CI/CD.

---

## Notes for testing

- Code was added on purpose to close the event stream completely when the browser goes offline, including when DevTools is switched to Offline. DevTools offline mode doesn't stop an already open `EventSource`, so without it events keep arriving. When the browser is back online, the stream reopens from the last `seq` (see `realtime.effects.ts`).
- To test what happens when the server stops, run the server and the apps in separate terminals: `npm run start:back` and `npm run start:front`. Then stop and restart only the server.
- Stop whatever is running before using the commands below. They all use the same ports, so a second start fails with `Port … is already in use`, and a running server keeps its data in memory and writes it back over a reset.
- To test with the full mock menu, run `npm run start:fresh`. To test with an empty menu, run `npm run start:empty`. Both replace the saved data.
- To test speed, run `npm run start:prod`. It keeps the saved data, so run `npm run reset:data` first for the mock menu, or `npm run clear:data` for an empty one.

---

## Claude

The app was built together with Claude Code, and the backend was written by it. The architecture of the app is entirely mine and stays as close as possible to how I build my own projects.

Angular skills used:

- `angular-developer`: Angular code generation and best practices (signals, components, forms, routing, testing).
- `angular-new-app`: creating the apps with the Angular CLI.

I left in the repository my [CLAUDE.md](CLAUDE.md), the file I use for my own projects.
