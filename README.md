# Order Explorer

A searchable, filterable, sortable explorer over **25,000 orders**, built for the DareAISearch
front-end assignment (**Problem Statement 1**). The interesting part isn't the table — it's how the
app behaves when the API is slow, flaky, and racing against a fast-typing user.

- **Live demo:** _add Vercel URL here_
- **Demo video:** _optional — add link here_

The mock API adds **200 ms – 3 s latency** to every request and **fails ~1 in 10** (a mix of HTTP 500s
and dropped connections). Use the **"Mock API"** menu in the header to switch to 0 / 10 / 50 / 100 %
failures or fast / realistic / slow latency; settings persist in `localStorage`.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest + Testing Library
npm run build      # type-check + production build
npm run preview    # serve the production build
```

No backend or environment variables are needed: the API is served by [MSW](https://mswjs.io) from a
service worker in the browser, in development *and* production.

## What it does

| Requirement | How |
| --- | --- |
| Never show stale results | Search is debounced (300 ms). Each request has an `AbortController`; changing the query aborts the old request, *and* responses are dropped unless their request id is the latest. Results are stored with the key they were fetched for, so the UI can't render data for a different query. |
| State in the URL | `q`, `status`, `channel`, `country`, `min`, `max`, `sort`, `dir`, `page`, `size` are the single source of truth. Refresh, Back/Forward and shared links restore the same view. Invalid params (`?page=abc`) are sanitised and the URL is canonicalised. |
| Fast with large lists | Server-side pagination (up to 500 rows/page) plus row virtualisation with `@tanstack/react-virtual` — only ~30 `<tr>`s exist at once. Rows are `memo`ised with stable props. |
| Honest states | Distinct loading (skeleton), empty ("no matches" + clear filters), out-of-range page, error (message + Retry, old rows removed) and partial-failure (list loaded, summary failed → inline retry for the summary only). |
| Accessible | Native `<table>` with `aria-sort`, `aria-rowcount`/`aria-rowindex` (correct even when virtualised), roving tab-index with ↑ ↓ PgUp PgDn Home End, visible focus everywhere, labelled filters, skip link, polite live region for result counts, `role="alert"` for errors, `prefers-reduced-motion` respected. |
| Detail view | `/orders/:id?…filters` opens a native modal `<dialog>` drawer (focus trap, Esc, inert background for free). It's a nested route, so the list stays mounted underneath: closing (button, Esc, backdrop or Back) keeps scroll position and filters, and returns focus to the row. Deep links work, including 404 for unknown ids. |

## Architecture

```
src/
  types.ts                 domain types + allowed values (single source for UI, URL and API)
  lib/
    urlState.ts            parse / serialize the query <-> URLSearchParams (shared with the mock server)
    useQueryState.ts       URL-backed state hook: history push vs replace, canonicalisation
    useCommittedInput.ts   debounced text input whose committed value lives in the URL
    useLatestQuery.ts      "latest request wins" fetching hook with abort + request-id guard
    queryCache.ts          small LRU + TTL cache (instant Back/Forward)
  api/client.ts            fetch wrappers, typed ApiError (network / server / not-found)
  mocks/                   MSW handlers, seeded dataset generator, query engine, chaos settings
  components/              ExplorerPage, Filters, OrdersTable, Pagination, SummaryBar, OrderDrawer, …
```

### State-management decisions

- **The URL is the state.** There is no global store. Filters, sort and page are derived from
  `useSearchParams` on every render; components call `update(patch)` which writes the URL. This makes
  refresh/back/share correct by construction rather than by synchronisation code.
- **Local state only for in-progress input.** The search box and amount inputs hold a draft so typing
  is instant; the draft is committed to the URL after 300 ms (or on Enter). If the URL changes from
  outside (Back, "Clear all") the draft follows it.
- **History semantics.** Discrete actions (a filter, sort, page) push a history entry. A burst of
  typing pushes *one* entry and then replaces it, so Back undoes "the search", not each letter.
- **Server state lives in `useLatestQuery`**, keyed by the canonical query string. The list and the
  summary are independent requests with independent keys (summary ignores sort/page), which is
  what makes the partial-failure state possible and avoids refetching totals when paging.
- **Any non-page change resets to page 1**, so you can't end up on page 40 of a 3-page result.

### Tradeoffs

- **Custom fetching hook vs. RTK Query / TanStack Query.** Those libraries would give dedupe,
  retries and background refetching. I wrote a ~90-line hook instead so the race-condition handling
  is explicit and directly testable, and because the requirements (one list + one summary + one detail)
  are small. In a larger app I'd use TanStack Query (`placeholderData` off, `signal` passed through).
- **Skeleton instead of dimmed previous results while loading.** Keeping old rows visible is
  smoother, but the brief stresses never making old data look current, so loading always clears rows.
  The table header and pagination stay mounted so keyboard focus is never lost.
- **No automatic retry.** With a 10 % failure rate, silent retries would hide the behaviour being
  evaluated. Errors are surfaced with a manual Retry. Production code would retry idempotent GETs once
  with backoff before showing the error.
- **Pagination + virtualisation instead of infinite scroll.** Page numbers make "restore exact
  view from URL" exact and cheap. Scroll offset *within* a page is not persisted across reloads.
- **MSW in production.** It keeps the demo free and self-contained, but adds ~160 kB gzip to the
  first load (lazy-loaded chunk) and requires a service-worker-capable browser.
- **Client-side caching for 60 s.** Back/Forward is instant; data could be up to a minute old.
  Acceptable for a demo; a real app would revalidate in the background.

## Tests

`npm test` — 15 targeted tests, focused on the tricky behaviour rather than coverage:

- `useLatestQuery.test.ts` — a slow earlier response resolving *after* a newer one is ignored and its
  request is aborted; new keys report loading instead of leaking old data; failures clear data and
  Retry recovers; cached keys render synchronously without a refetch.
- `ExplorerPage.test.tsx` (integration, real router + components, mocked API with manually-resolved
  promises) — out-of-order filter responses, debounced typing → one request, error hides old rows and
  Retry recovers, shared URL restores inputs, sort and the request.
- `urlState.test.ts` — full round-trip, clean default URL, sanitising malformed/malicious params.
- `query.test.ts` — server-side filter/sort/pagination consistency, stable sort across pages, out-of-range page.

## Sources & references

- MSW docs — [browser integration](https://mswjs.io/docs/integrations/browser), [`delay`](https://mswjs.io/docs/api/delay), [`HttpResponse.error()`](https://mswjs.io/docs/api/http-response#httpresponseerror)
- TanStack Virtual — [`useVirtualizer`](https://tanstack.com/virtual/latest/docs/api/virtualizer) (`initialRect`, `scrollToIndex`)
- React docs — [You might not need an effect: adjusting state when a prop changes](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes), [fetching data with cleanup to avoid race conditions](https://react.dev/reference/react/useEffect#fetching-data-with-effects)
- React Router v7 — [`useSearchParams`](https://reactrouter.com/api/hooks/useSearchParams), nested routes / `<Outlet>`
- MDN — [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController), [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog), [`aria-rowindex`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-rowindex), [`aria-sort`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-sort)
- WAI-ARIA APG — [Sortable table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/), [roving tabindex](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex)
- Mulberry32 PRNG (public domain) for a deterministic dataset
- Libraries: React 19, React Router 7, @tanstack/react-virtual, Tailwind CSS 4, MSW 2, Vite, Vitest, Testing Library
- Free tier: Vercel (hosting)

## AI usage

I built this with an AI coding agent (Cursor) and directed/reviewed its output. Chat export: _add link here_.

How I used it and what I checked:

- I chose Problem Statement 1 and the architecture (URL as state, custom latest-request hook, MSW in prod,
  pagination + virtualisation) and had the agent scaffold it.
- I verified behaviour in a real browser, not just tests: forced 100 % failures, rapid filter toggling
  under 200 ms–3 s latency, deep links, Back/Forward, keyboard-only navigation.
- Bugs caught during review and fixed:
  - Sort-header buttons unmounted during loading (skeleton replaced the table), so keyboard users lost focus.
    Fixed by keeping the `<thead>` mounted and rendering loading/empty/error states inside the table body.
  - When the focused row was virtualised away, *no* row was tabbable, so Tab skipped the table.
    Fixed by falling back to the first rendered row.
  - Focus didn't return to the row after closing the drawer because the effect cleanup ran after the
    `<dialog>` was detached and the browser's focus fix-up won. Moved to a layout-effect cleanup.
