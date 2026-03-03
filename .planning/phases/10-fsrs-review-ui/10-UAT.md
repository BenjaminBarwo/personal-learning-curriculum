---
status: complete
phase: 10-fsrs-review-ui
source: [10-01-SUMMARY.md, 10-02-SUMMARY.md]
started: 2026-03-03T03:00:00Z
updated: 2026-03-03T06:11:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard due-today widget visible
expected: When you have FSRS cards due today, the dashboard shows a "X cards due today" widget between the continue card and the pillar grid. It links to /review and shows a chevron arrow. The label says "Spaced Repetition" above the count.
result: pass
notes: Initially failed because fsrs_cards table didn't exist (migration 00004 not applied). After applying migration and seeding cards, widget appeared correctly.

### 2. Dashboard widget absent when no cards due
expected: When you have zero FSRS cards due, the dashboard does NOT show the "cards due today" widget at all — it's completely absent, not just hidden.
result: pass
notes: Confirmed absent before cards were seeded (dueCount was 0). Code uses {dueCount > 0 && ...} conditional rendering.

### 3. Review page loads with question displayed
expected: Visiting /review when cards are due shows a "Review" heading, "Card 1 of N" progress text, and the first question's text inside a card container with a "Show Answer" button below.
result: pass

### 4. Show Answer reveals correct answer and explanation
expected: Clicking "Show Answer" reveals the correct answer and explanation below a divider. For multiple-choice questions, options are shown with the correct one highlighted in green. The "Show Answer" button disappears and is replaced by rating buttons.
result: issue
reported: "Question 4 says 'Examine the training curve below' but no training curve shown — context field was missing from query and UI"
severity: major
fix: Added context field to DueCardForReview, PostgREST query, and ReviewSession rendering (commit db6da8a)

### 5. Rating buttons with interval hints
expected: After revealing the answer, four rating buttons appear in a row: Again (red), Hard (orange), Good (blue), Easy (green). Each button shows a time interval hint below its label (e.g., "1 min", "10 min", "8 days").
result: pass

### 6. Rating advances to next card
expected: Clicking a rating button submits the review, then shows the next card with "Card 2 of N" progress. The answer is hidden again and "Show Answer" button returns. Buttons are briefly disabled during submission.
result: pass
notes: Confirmed reviews persist to DB — fsrs_review_logs and fsrs_cards both updated correctly with FSRS algorithm state.

### 7. All caught up after last card
expected: After rating the final card in the queue, the page transitions to show an "All caught up!" message with a green checkmark icon, the time until next review (e.g., "Next review in 10 minutes"), and a "Back to Dashboard" button.
result: pass

### 8. All caught up when visiting with empty queue
expected: Visiting /review when no cards are due immediately shows the "All caught up!" state. If no FSRS cards exist at all, it shows "Complete some lessons to start building your review deck" instead of a time until next review.
result: pass
notes: /review page correctly renders "All caught up" when no cards are due. Initial confusion was about the dashboard widget hiding (by design per Test 2), not /review itself. User confirmed /review works when navigated to directly.

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Show Answer reveals correct answer with full context for all question types"
  status: resolved
  reason: "User reported: Question 4 says 'Examine the training curve below' but no training curve shown — context field was missing"
  severity: major
  test: 4
  root_cause: "getDueCardsForReview() did not include context in PostgREST select; DueCardForReview interface missing context field; ReviewSession had no context rendering"
  artifacts:
    - path: "src/lib/actions/fsrs.ts"
      issue: "context not in select() or interface"
    - path: "src/components/review/ReviewSession.tsx"
      issue: "no context rendering block"
  missing:
    - "context field in DueCardForReview interface"
    - "context in PostgREST select clause"
    - "context rendering in ReviewSession JSX"
  fix_commit: "db6da8a"
