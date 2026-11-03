# Claude Code Rules

## Git

- Never commit or push changes
- Leave all changes as unstaged

## Workflow

- Always follow the ESLint and Prettier rules configured in this repository — do not override or work around them
- After making changes, run Prettier and the linter only on the files you modified (not the whole project)
- Fix all lint and Prettier issues on your touched files before considering the task done
- Add only the controls the task asks for — no extra selects, fields or options that were not requested
- Round-trip API values as received (an epoch number stays a number); converting them "to be helpful" is how payloads break
- A verification only counts if its exit status was checked — a command whose output you skimmed is not a passing check

## Angular / Components

- Every new component must declare `changeDetection: ChangeDetectionStrategy.OnPush`
- Keep templates and styles in separate files via `templateUrl` and `styleUrl` — do not inline `template` / `styles` in the `@Component` decorator
- Build flexible UI components (modals, dropdowns, panels, etc.) with `<ng-content select="...">` slots so consumers can compose content, rather than passing large config objects

## Angular / Services

- Services must return `Observable` — never subscribe inside a service

## Angular Signals & Modern APIs

- Use `input()` and `input.required<T>()` instead of `@Input()` decorator
- Use `output()` instead of `@Output()` + `EventEmitter`
- Use `viewChild()` / `viewChildren()` (and `contentChild()` / `contentChildren()`) signal-based queries instead of the `@ViewChild` / `@ViewChildren` decorators
- Use `computed()` for derived reactive state instead of getters or manual change detection
- Extract complex computed logic into private methods and call them from `computed()` — e.g. `computed(() => this.getX(this.a(), this.b()))`
- Extract complex effect logic into private methods and call them from `effect()` — pass reactive values read in the callback as arguments; any further signals read inside the method are still tracked since it runs within the effect's synchronous execution, e.g. `effect((onCleanup) => this.handleX(this.signal(), onCleanup))`
- Do not use `ngOnInit` for signal-based components — initialise everything as class fields
- Use `toSignal()` to bridge RxJS streams into the reactive template context cleanly.
- Let signal types be inferred — no `Signal<T>` / `InputSignal<T>` field annotations and no generics on `toSignal` / `computed` (e.g. not `isDesktop: Signal<boolean> = toSignal<boolean, boolean>(...)`, just `isDesktop = toSignal(...)`); typed selectors and `input<T>()` already carry the type

## Subscriptions

- When subscribing inside a component, always unsubscribe — prefer `takeUntilDestroyed()`, or other valid teardown patterns (`takeUntil(destroy$)`, `async` pipe)
- For one-shot streams (e.g. an HTTP call fired imperatively), terminate with `take(1)` or use `firstValueFrom` instead of leaking a long-lived subscription
- Prefer signals in templates (`selectSignal`, `toSignal`) over the `async` pipe and manual `.subscribe()` — use the `async` pipe only where a signal doesn't fit, and subscribe imperatively only for a side effect that can't be expressed via the template

## Comments

- Write as few comments as possible — by default, write none
- Keep comments short — a line or two at most. Do not write long explanatory blocks or multi-paragraph JSDoc
- Comment only what the code cannot say itself: a non-obvious `why`, a workaround, a known gotcha
- Do not restate what the code does, and do not narrate the history of a fix in a comment
- When inserting code, never come between an existing comment and the declaration it documents — anchor the insertion above the comment, not above the declaration

## Constants & Maps

- Constants and maps must live in their own dedicated files (not inlined in components or services)

## Folder Structure (frontend)

- Group files by kind, not by feature: `components/<name>/`, `models/`, `config/`, `services/`, `store/<slice>/`, `pipes/`, `directives/`, `slots/`, `interceptors/`, `guards/`, `helpers/`, `routes/`
- Inside an app's `components/`: routed components go in `pages/<name>/`, app and page frames in `layout/<name>/`, components opened through `DialogService` in `dialogs/<name>/`, everything else in `blocks/<name>/`
- A component folder holds only that component's `.ts` / `.html` / `.scss` / spec — never models, configs or services
- Every interface, type alias and enum goes in `models/*.model.ts` (one file per area), including state interfaces and service option types; ESLint enforces this
- `models/` has an `index.ts`; the library root `index.ts` re-exports `./models` and lists other public files by path
- Inside a library, import by relative path to the file, not through a barrel

## Naming Conventions

- Observable / Subject fields and locals end with `$` — e.g. `notificationsList$`, `isShowLoader$`, `query$`
- File names use kind-specific suffixes: `*.component.ts`, `*.service.ts`, `*.model.ts`, `*.enum.ts`, `*.config.ts`, `*.pipe.ts`, `*.directive.ts`, `*.guard.ts`, `*.interceptor.ts`
- NgRx files: `*.actions.ts`, `*.reducer.ts`, `*.effects.ts`, `*.selectors.ts`
- NestJS files: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.dto.ts`, `*.filter.ts`
- Do not append type-kind suffixes/prefixes to TypeScript symbol names — no `Enum` suffix on enums, no `I` / `Interface` prefix or suffix on interfaces (the file suffix already conveys the kind)

## Code Patterns

- Follow existing patterns — look for prior art in the codebase before introducing new approaches
- When logic will be reused in more than one place, extract it into the appropriate primitive — a helper for pure functions, a pipe for template transformations, a service for stateful or DI-backed logic
- When creating new interfaces/models or shared components, always export them from the `index.ts` (barrel file) of the current folder

## Compound Components (Shell + Slots)

- For a UI element with several variants, build a **shell + slots** module instead of one component branching on a type input.
- The **shell** is structural only: it renders the layout wrapper + regions and projects content through named `<ng-content select="...">` slots. It owns only structural inputs and shared view state — never a type input or per-variant `@if`. If you need a variant branch, it belongs in an assembled variant, not the shell.
- Expose shared view state **outward** via the template ref (`exportAs`), not via inputs flowing back in — e.g. `exportAs: 'shell'`, then `#shell="shell"` and read `shell.isHovered()` in slot content. The shell must not reach into projected content.
- **Slots are marker directives**, grouped in one file (`slots/*.ts`), each carrying a class the markup targets. Put small structural inputs on the slot directive, not the shell.
- Promote slot content to a **reusable standalone component** only on genuine reuse across variants (driven purely by inputs); keep one-off markup inline in the assembled variant.
- Put cross-cutting behaviour in an **attribute directive** so any variant can opt in by hanging it on an element.
- Ship the shell + slot directives + reusable content as a **single `imports` bundle** const; assembled variants spread it (`imports: [...SHELL, ...own]`) rather than listing pieces by hand. Keep the bundle and the `index.ts` barrel in sync as pieces are added.
- Concrete/assembled variants live in their own app, never in the shared library.
- **Styling:** do not use `ViewEncapsulation.None` with global cascading SCSS partials or inline `host: { style: ... }` — global styles leak into the whole app, collide on class names and can't be changed safely; inline host styles hide layout in TS and can't be themed. Style through **class-based attribute directives** hung on the elements, or keep styles **encapsulated inside the component** that owns the markup.

## TypeScript

- Use proper types — never `any`, never double-cast via `as unknown as T`. If a value can be null/undefined, widen the declared type (`T | null`) instead of lying with a cast.
- `unknown` is allowed only at system boundaries (`catch` variables, `JSON.parse`, untyped third-party data) and must be narrowed immediately with a type guard
- Values read back from our own `StorageService` need no type guard: we wrote them, and a changed format gets a new versioned key
- Prefer `readonly` for fields that aren't reassigned after construction (enum aliases, injected configs, constants)
- Angular: inject dependencies with `inject()` into `private readonly` fields — it works in field initializers, which signal-based components rely on
- NestJS: constructor-inject dependencies with explicit `private readonly` parameters (do not declare them as separate fields)
- Use string-valued enums with PascalCase keys and the exact string the API sends as the value (`Placed = 'placed'`, `MenuChanged = 'MENU_CHANGED'`) — never change an existing value for fixed sets of values, including in shared API contracts — never numeric. APIs serialise enums as strings, so a numeric enum silently sends the wrong payload
- Do not redeclare a type that already exists in a shared models library

## Workspace

- Separate apps in one workspace never import from each other — cross-app code must live in a shared library project
- Only the shared UI library imports the UI component library (e.g. `@angular/material`); apps and features use its wrappers, whose public API exposes only our own types. If a wrapper lacks something, extend the wrapper instead of importing the library directly
