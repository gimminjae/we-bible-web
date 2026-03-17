# Requirements And Plan

Date: 2026-03-17

## Original request

Port `we-bible-app` to a new web application named `we-bible-web`.

Required stack:

- TypeScript
- Next.js
- Zustand
- React Query
- Tailwind CSS
- DaisyUI

Required behavior:

- Implement all major features and UI elements from `we-bible-app`
- Replace SQLite data management with `localStorage`
- Use Zustand for front-end state
- Use React Query only through a custom abstraction
- Provide a `useCustomQuery` hook so feature code does not directly expose React Query
- Prioritize mobile UI
- Keep desktop centered with left and right empty space
- Preserve UI details carefully during porting
- Save planning and implementation details as markdown

## Migration plan

The work was carried out in this order:

1. Inspect the Expo app routes, storage utilities, feature modules, shared services, and reusable domain data.
2. Create the Next.js app and install the requested dependencies.
3. Build the global foundation:
   - root layout
   - providers
   - centered mobile shell
   - tab bar
   - reusable page header, bottom sheet, loading, and toast layers
4. Reuse stable shared Bible/domain logic from the original app where practical.
5. Replace SQLite persistence with a Zustand store persisted to `localStorage`.
6. Rebuild each feature screen and local CRUD flow in web form.
7. Keep remote Bible loading behind `useCustomQuery` and feature-level query hooks.
8. Run lint and production build verification.

## Scope carried into the web port

The web port was intended to preserve:

- Bible reading flow
- Book/chapter/language controls
- Dual-language reading
- Verse selection/copy/favorite/memo actions
- Favorites list
- Memo list/detail/edit
- Prayer list/detail/edit
- Plan list/detail/edit and chapter tracking
- My page dashboard and Bible grass
- Settings, theme, app language, export/import
