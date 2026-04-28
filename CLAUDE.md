# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                        # Start dev server with hot reload (tsx watch)
npm run build                      # Compile TypeScript to dist/
npm run start                      # Build + run production server
npm test                           # Run all Jest tests
npm test -- --runInBand            # Run tests serially (required in CI)
npm test -- path/to/file.spec.ts   # Run a single test file
npm run typecheck:domain           # Type-check domain/infrastructure/shared layers only
npm run clean                      # Delete dist/
```

No lint script is configured — type checking is done via `tsc` and `typecheck:domain`.

## Architecture

Express + TypeScript service deployed to GCP Cloud Run via Docker. It exposes REST endpoints consumed by a Chrome extension, integrating with the Allegro (Polish e-commerce) OAuth 2.0 API and messaging API.

### Clean Architecture Layers

```
presentation → application → domain ← infrastructure
```

- [src/presentation/](src/presentation/) — Express routes + controllers (HTTP boundary)
- [src/application/services/](src/application/services/) — Business logic (`ClientsService`, `TokenService`, `TokenRefreshService`, `MessagesService`)
- [src/domain/](src/domain/) — Repository interfaces only (`IClientsRepository`, `ITokensRepository`); no entity classes yet
- [src/infrastructure/](src/infrastructure/) — Firestore repository implementations + Allegro Axios client
- [src/shared/](src/shared/) — Cross-cutting utilities: `Result<T>` pattern, PKCE helpers

### Dependency Injection

No DI framework is used. Services are instantiated once with their concrete repository dependencies and exported as module-level singletons at the bottom of each service file:

```typescript
export const clientsService = new ClientsService(new FirestoreClientsRepository());
```

### Error Handling

Services return `Result<T>` from [src/shared/patterns/result-pattern.ts](src/shared/patterns/result-pattern.ts) instead of throwing. Use `result.isSuccess()` / `result.isFailure()` / `result.getValue()` / `result.getError()`.

### Firestore Data Model

Each collection stores a **single document** (`tokens-list` or `clients-list`) containing a map keyed by `clientLogin`:

- `tokens` collection — `{ [clientLogin]: { accessToken, refreshToken, expiresIn } }`
- `clients` collection — `{ [clientLogin]: { clientId, clientSecret, isAuthorized } }`

### Allegro OAuth Flow

Authorization Code + PKCE (S256). Tokens are saved to Firestore after the callback. `TokenService.getValidToken()` checks expiry and calls `TokenRefreshService` automatically before returning a token to callers.

### Layer Isolation Enforcement

`tsconfig.domain.json` restricts compilation to `domain/`, `infrastructure/`, and `shared/` only — run via `npm run typecheck:domain`. [src/domain/repositories/repositories.contracts.typecheck.ts](src/domain/repositories/repositories.contracts.typecheck.ts) uses assignment checks to ensure Firestore implementations fully satisfy the domain interfaces at compile time.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (defaults to 8080) |
| `GC_PROJECT_ID` | GCP project ID for Firestore |
| `FIRESTORE_DATABASE` | Firestore database name |
| `CLIENT_ID` | Allegro OAuth client ID |
| `CLIENT_SECRET` | Allegro OAuth client secret |
| `ALLEGRO_API_BASE_URL` | Allegro API base URL (`https://allegro.pl`) |
| `SERVICE_API_URL_LOCAL` | Local service URL for OAuth callbacks |
| `SERVICE_API_URL_PROD` | Production service URL for OAuth callbacks |
