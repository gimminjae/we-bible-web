# Implementation Summary

Date: 2026-03-17

## Architecture

### App framework

- Next.js App Router
- TypeScript

### State management

Local front-end data is managed through Zustand in:

- `src/store/app-store.ts`

Persisted state includes:

- theme
- app language
- Bible reader settings and current location
- favorites
- memos
- prayers
- plans
- grass/progress data
- reward usage metadata

Persistence is browser-local and uses `localStorage`.

### API data management

Bible chapter loading remains API-backed and is wrapped through:

- `src/hooks/use-custom-query.ts`
- `src/hooks/use-bible-query.ts`

This keeps React Query out of feature-layer code. React Query is only used in the provider/custom hook layer.

### Layout and styling

- Tailwind CSS
- DaisyUI
- centered mobile shell for desktop
- mobile-first spacing and navigation patterns
- bottom-sheet based interactions to preserve the original app feel

## Major implementation areas

Core foundation:

- `src/app/layout.tsx`
- `src/components/providers.tsx`
- `src/components/layout/mobile-shell.tsx`
- `src/components/layout/tab-bar.tsx`
- `src/app/globals.css`

Reader and reusable UI:

- `src/app/page.tsx`
- `src/components/ui/bottom-sheet.tsx`
- `src/components/ui/page-header.tsx`
- `src/components/ui/toast-viewport.tsx`

Feature areas:

- `src/app/favorites/page.tsx`
- `src/app/memos/page.tsx`
- `src/app/memos/[id]/page.tsx`
- `src/app/prayers/page.tsx`
- `src/app/prayers/add/page.tsx`
- `src/app/prayers/[id]/page.tsx`
- `src/app/prayers/[id]/edit/page.tsx`
- `src/app/plans/page.tsx`
- `src/app/plans/add/page.tsx`
- `src/app/plans/[id]/page.tsx`
- `src/app/plans/[id]/edit/page.tsx`
- `src/app/mypage/page.tsx`
- `src/app/settings/page.tsx`

Supporting utilities:

- `src/lib/storage.ts`
- `src/lib/backup.ts`
- `src/lib/plan.ts`
- `src/lib/grass.ts`
- `src/lib/date.ts`
- `src/lib/clipboard.ts`

## Migrated feature summary

### Bible reader

- book/chapter picker
- language picker
- dual-language mode
- secondary language selection
- font size control
- previous/next chapter navigation
- verse selection
- copy selected verses
- add/remove favorites
- create memo from verse selection
- memo/favorite indicators per verse

### Memos

- create memo
- memo list
- memo detail
- edit memo
- delete memo
- copy memo contents

### Prayers

- create prayer
- prayer list
- prayer detail
- edit prayer requester/target
- add/update/delete prayer content items

### Plans

- create reading plan
- select books
- set date range
- track chapter progress
- plan detail and edit flows
- progress calculations

### My page and settings

- dashboard-style entry page
- Bible grass visualization
- theme switching
- app language switching
- export/import backup flow

## Data migration decision

The original SQLite-backed local data layer was not ported directly.

Instead:

- Zustand became the single client-side state source
- Zustand persistence middleware stores state in `localStorage`
- local CRUD flows are synchronous and browser-local
- export/import utilities provide backup and restore behavior
