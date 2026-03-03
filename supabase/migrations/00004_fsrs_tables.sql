-- =============================================================================
-- Migration: 00004_fsrs_tables
-- Phase: 09-fsrs-data-layer
-- Description: FSRS spaced repetition tables — fsrs_cards (card state) and
--              fsrs_review_logs (append-only review audit log).
--
-- Follows project conventions from 00001_initial_schema.sql:
--   - user_id TEXT NOT NULL (Clerk IDs are strings, not UUIDs)
--   - RLS with current_setting('request.jwt.claims', true)::json->>'sub'
--   - Separate SELECT/INSERT/UPDATE policies (no FOR ALL)
--   - Indexes on user_id and all query-critical columns
--   - updated_at trigger using existing update_updated_at() function
-- =============================================================================


-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- fsrs_cards: one row per (user, quiz_question) — holds current FSRS card state
CREATE TABLE fsrs_cards (
  id              UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT             NOT NULL,               -- Clerk user ID (TEXT, not UUID)
  question_id     UUID             NOT NULL REFERENCES quiz_questions(id),
  lesson_id       UUID             NOT NULL REFERENCES lessons(id), -- denormalized for batch queries
  -- FSRS algorithm fields (match ts-fsrs Card interface exactly)
  due             TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  stability       DOUBLE PRECISION NOT NULL DEFAULT 0,
  difficulty      DOUBLE PRECISION NOT NULL DEFAULT 0,
  elapsed_days    INTEGER          NOT NULL DEFAULT 0,
  scheduled_days  INTEGER          NOT NULL DEFAULT 0,
  learning_steps  INTEGER          NOT NULL DEFAULT 0,     -- ts-fsrs v5 field (step index within learning phase)
  reps            INTEGER          NOT NULL DEFAULT 0,
  lapses          INTEGER          NOT NULL DEFAULT 0,
  state           INTEGER          NOT NULL DEFAULT 0,     -- 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ      DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ      DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, question_id)                            -- one card per user per question
);

-- fsrs_review_logs: append-only log of every review (matches ts-fsrs ReviewLog)
CREATE TABLE fsrs_review_logs (
  id                UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           TEXT             NOT NULL,
  card_id           UUID             NOT NULL REFERENCES fsrs_cards(id),
  question_id       UUID             NOT NULL REFERENCES quiz_questions(id), -- denormalized
  -- ts-fsrs ReviewLog fields
  rating            INTEGER          NOT NULL,     -- 1=Again, 2=Hard, 3=Good, 4=Easy
  state             INTEGER          NOT NULL,     -- card state BEFORE this review
  due               TIMESTAMPTZ      NOT NULL,     -- when card was due BEFORE this review
  stability         DOUBLE PRECISION NOT NULL,
  difficulty        DOUBLE PRECISION NOT NULL,
  elapsed_days      INTEGER          NOT NULL,
  last_elapsed_days INTEGER          NOT NULL,
  scheduled_days    INTEGER          NOT NULL,
  review            TIMESTAMPTZ      NOT NULL,     -- timestamp of this review
  created_at        TIMESTAMPTZ      DEFAULT NOW() NOT NULL
  -- NO updated_at — append-only (immutable audit log like quiz_attempts)
);


-- =============================================================================
-- 2. INDEXES
-- =============================================================================

-- fsrs_cards indexes
CREATE INDEX idx_fsrs_cards_user_id ON fsrs_cards(user_id);
CREATE INDEX idx_fsrs_cards_user_question ON fsrs_cards(user_id, question_id);
CREATE INDEX idx_fsrs_cards_user_due ON fsrs_cards(user_id, due);   -- getDueCardCount() filter

-- fsrs_review_logs indexes
CREATE INDEX idx_fsrs_review_logs_user_id ON fsrs_review_logs(user_id);
CREATE INDEX idx_fsrs_review_logs_card_id ON fsrs_review_logs(card_id);


-- =============================================================================
-- 3. UPDATED_AT TRIGGER
-- =============================================================================

-- Reuses update_updated_at() function from 00001_initial_schema.sql
CREATE TRIGGER trg_fsrs_cards_updated_at
  BEFORE UPDATE ON fsrs_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- NOTE: fsrs_review_logs has NO updated_at trigger — append-only table


-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE fsrs_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsrs_review_logs ENABLE ROW LEVEL SECURITY;

-- fsrs_cards policies (SELECT + INSERT + UPDATE — user can manage own cards)
CREATE POLICY "Users can view own fsrs cards"
  ON fsrs_cards FOR SELECT
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own fsrs cards"
  ON fsrs_cards FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can update own fsrs cards"
  ON fsrs_cards FOR UPDATE
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'))
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

-- fsrs_review_logs policies (SELECT + INSERT only — no UPDATE/DELETE, append-only)
CREATE POLICY "Users can view own fsrs review logs"
  ON fsrs_review_logs FOR SELECT
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own fsrs review logs"
  ON fsrs_review_logs FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));
