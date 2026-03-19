# SQLite Persistence Follow-up

Date: 2026-03-19

## Why this follow-up was needed

The first persistence change replaced direct `localStorage` access with a Web SQL-backed adapter.

That direction still needed two practical fixes:

1. Unsupported browsers were falling back only to in-memory storage, which would lose data after refresh.
2. Existing backup files marked with `source: "localStorage"` would no longer import successfully.

## What was changed

### 1. Safer fallback behavior

- The storage adapter still prefers the browser SQLite/Web SQL path when it is available.
- If that database layer is unavailable, persistence now falls back to `window.localStorage` instead of volatile memory.
- Server-side/non-browser usage still keeps the in-memory fallback.

## 2. Backup compatibility

- New exports still identify the active persistence layer as `sqlite`.
- Import validation now accepts both:
  - `sqlite`
  - `localStorage`

This keeps older backup files restorable after the persistence migration.

## Files updated

- `src/lib/storage.ts`
- `src/lib/backup.ts`
- `src/components/bible/types.ts`
