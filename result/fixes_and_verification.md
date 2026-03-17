# Fixes And Verification

Date: 2026-03-17

## Follow-up fixes after the initial port

### 1. Settings page infinite loop / getSnapshot error

Issue:

- React reported: `The result of getSnapshot should be cached to avoid an infinite loop`

Cause:

- `src/app/settings/page.tsx` selected Zustand state with an object-literal selector:
  - `useAppStore((state) => ({ ... }))`
- that selector created a new object on every render

Fix:

- wrapped the selector with Zustand shallow comparison using:
  - `useShallow(...)`

File updated:

- `src/app/settings/page.tsx`

### 2. Hydration mismatch on body attributes

Issue:

- Next.js reported hydration mismatch warnings on `<body>`
- the mismatch showed attributes such as:
  - `data-new-gr-c-s-check-loaded`
  - `data-gr-ext-installed`

Cause:

- those attributes were injected before hydration by a browser extension
- `suppressHydrationWarning` was set on `<html>` but not on `<body>`

Fix:

- added `suppressHydrationWarning` to `<body>` in the root layout

File updated:

- `src/app/layout.tsx`

### 3. Port stabilization and lint fixes

Additional cleanup was applied during the port to keep the web app production-safe:

- removed local state sync effects that caused React hook lint issues
- fixed bottom sheet client rendering behavior
- tightened copied helper typings
- corrected the reader secondary-language control rendering
- made memo and plan forms mount-safe

Representative files:

- `src/app/page.tsx`
- `src/components/memos/memo-sheet.tsx`
- `src/components/plans/plan-form.tsx`
- `src/components/ui/bottom-sheet.tsx`
- `src/services/api.ts`
- `src/services/bible.ts`
- `src/utils/browser.util.ts`

## Verification status

Executed in `C:\Users\minja\mylists\we-bible-web`:

1. `npm run lint`
2. `npm run build`

Current result:

- lint: passed
- build: passed

Verified routes from the production build:

- `/`
- `/favorites`
- `/memos`
- `/memos/[id]`
- `/mypage`
- `/plans`
- `/plans/[id]`
- `/plans/[id]/edit`
- `/plans/add`
- `/prayers`
- `/prayers/[id]`
- `/prayers/[id]/edit`
- `/prayers/add`
- `/settings`

## Current note

The codebase is build-clean and lint-clean at this stage. Browser extension-driven DOM mutations should no longer produce noisy hydration warnings at the root layout level.
