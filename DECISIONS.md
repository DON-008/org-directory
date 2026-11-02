# Decisions

Format: **Chose** / **Rejected** / **Why**.

## 1. Conflict 1: no pagination vs API limits
## 2. Conflict 2: colour-only status vs accessibility
## 3. Status normalisation
## 4. Duplicate id 42
## 5. Missing or invalid values
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