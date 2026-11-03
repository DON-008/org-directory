# Decisions


## 1. Conflict 1: no pagination vs API limits
- Math: 137 records / 25 per request = 6 requests, but only 5 are allowed per minute. A full load cannot finish in under ~60 s.
- Chose: one scrolling list that fills in progressively. Page 1 renders immediately; the rest load sequentially in the background through a sliding-window limiter (5 per 60 s). Progress is shown ("Loaded 125 of 137"). A 429 is treated as a fallback: wait for Retry-After and retry.
- Failures: each page gets one retry. A page that fails twice is recorded, loaded rows stay visible, and Retry fetches only the missing pages.
- Rejected: pagination (ops asked for none); infinite scroll (breaks global sort and search); waiting for all pages before rendering (60 s blank screen).
- Gave up: a complete dataset for up to ~60 s, and rows shift as late pages arrive.
- Assumption: failed requests count against the rate limit, so retries are not free.
## 2. Conflict 2: colour-only status vs accessibility
- Chose: a small dot plus a visible text label. The dot is decorative (aria-hidden); the label carries the meaning. Unknown status is a hollow ring, so it also differs by shape.
- Rejected: dot only, with the label in a tooltip or aria-label. Sighted colour-blind users get nothing from it, and tooltips are invisible on touch and keyboard (WCAG 1.4.1, use of colour).
- Contrast: all dot colours are at least 3:1 against the background (WCAG 1.4.11).
- Gave up: the cleaner, label-free table the designer wanted. The label is muted and small to keep the visual weight low.
## 3. Status normalisation
- Chose: trim + lowercase, map to active / inactive / suspended; everything else is "unknown".
- Rejected: fuzzy matching ("actve" → "active").
- Why: guessing silently changes data; an honest "Unknown" is visible and can be fixed at the source.

## 4. Duplicate id 42
- Chose: keep both records, track rows by `id-index`, flag both with a duplicate-id issue.
- Rejected: dedupe by id (can't know which record is right); trackBy id (breaks rendering).

## 5. Missing or invalid values
- Chose: null means unknown, shown as "—". Negative or non-numeric counts are never shown as 0.
- Invalid emails are shown as typed with an "invalid" marker, not as a mailto link.
- Invalid dates show "—" and always sort last.
- Sorting: names use Intl.Collator (case/accent-insensitive, natural numbers, works for Arabic). Rows with no value (no name, invalid date) always sort last, in both directions. Adding a sortable column is one line in COLUMNS.
## 6. Search and sort on partial data
- Search, filter and sort run client-side on the rows loaded so far. The UI says results are partial until loading completes.
- While loading is incomplete and a filter is active, the UI says results may be incomplete.
## 7. Name uniqueness (client + server)
- Chose: an instant client check against the names loaded so far (ignores case, outer and repeated spaces), plus a server check on save. The mock POST compares against all 137 records and returns 409, which the form shows as a field error.
- The form says so when the list isn't fully loaded ("checked against 125 of 137"), and re-validates as more pages arrive.
- Rejected: client-only (can't see unloaded pages); blocking the form until the list is complete (up to a minute's wait).
- Uniqueness ignores case and spacing but not accents: "Café" and "Cafe" are different names, unlike in search.
- Validation shows on blur. A failed submit shows a summary (role=alert) and focuses the first invalid field. The submit button stays enabled; a silently disabled button explains nothing.
- Email: Validators.email accepts "a@b", so a stricter pattern requires a dot after the @.
- Known gap: no unsaved-changes warning when leaving the form.

## 8. URL as state
- Chose: the URL holds search, status, sort key and direction (`?q=&status=&sort=&dir=`). The list reads it with toSignal(queryParamMap), and controls navigate. Defaults are left out of the URL. Invalid values fall back to defaults.
- Typing is debounced (300 ms) and uses replaceUrl so history isn't flooded. Status and sort changes push history entries so Back undoes them.
- Rejected: component-local state mirrored into the URL (two sources of truth that drift apart).
- Search is name-only, ignores case, accents and repeated spaces. This is intentionally different from the uniqueness rule, where "Café" and "Cafe" stay different organisations.
## 9. Assumptions
- Failed requests count against the 5/min rate limit.
- Created organisations live in memory only; a reload loses them (the mock doesn't persist).
- Mock API: counts every non-429 list request (including 500s) against the 5/min budget; 429s are not counted. Counter is in memory (resets on reload).
- Create is mocked with server-side uniqueness (409), and created records appear in later list responses.
## 10. AI tool declaration
- 

## 11. Loading, empty and error states
- Chose: one panel component for all message states, each with its own icon, heading and border colour, so colour is never the only signal. Error uses role="alert"; the others use role="status".
- Empty (the API has nothing) and no-results (filters match nothing) are separate states. Only no-results offers "Clear filters".
- A total failure (page 1 failed twice) shows an error panel. A partial failure keeps the loaded rows and adds a warning with a retry for the missing pages only.
- Loading uses a skeleton with aria-busy on the results area. The progress line sits outside that area because screen readers can suppress announcements inside a busy region.
- Known limitation: after clicking Try again, focus is lost because the panel is replaced. With more time I would move focus to the progress line.