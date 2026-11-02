# Decisions

Format: **Chose** / **Rejected** / **Why**.

## 1. Conflict 1: no pagination vs API limits
## 2. Conflict 2: colour-only status vs accessibility
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
## 6. Search and sort on partial data
## 7. Name uniqueness (client + server)
## 8. URL as state
## 9. Assumptions
- "R3" is referenced but not defined; I assumed it means tests.
- Failed requests count against the 5/min rate limit.
## 10. AI tool declaration
- (fill in honestly as you go)

- Mock API: counts every non-429 list request (including 500s) against the 5/min budget; 429s are not counted. Counter is in memory (resets on reload).
- Create is mocked with server-side uniqueness (409), and created records appear in later list responses.