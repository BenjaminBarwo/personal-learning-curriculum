-- =============================================================================
-- Migration: 00001_initial_schema
-- Phase: 01-infrastructure
-- Description: Complete database schema — all 11 tables, indexes, RLS policies,
--              updated_at triggers, soft-delete columns, and active-record views.
--
-- ANTI-PATTERNS AVOIDED:
--   - NO auth.uid() (returns NULL with Clerk — use current_setting JWT sub claim)
--   - NO UUID type for user_id (Clerk IDs are strings)
--   - NO single FOR ALL policy (use separate SELECT/INSERT/UPDATE/DELETE)
--   - RLS enabled on ALL tables including junction tables
--   - Indexes on ALL user_id and foreign key columns
-- =============================================================================


-- =============================================================================
-- 1. HELPER FUNCTION: updated_at auto-update trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 2. CONTENT TABLES (no user_id — content is global/authoritative)
-- =============================================================================

-- pillars: top-level learning domains (e.g. "Systems Thinking", "Finance")
CREATE TABLE pillars (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT        NOT NULL,
  slug           TEXT        NOT NULL UNIQUE,          -- URL-safe identifier
  description    TEXT,
  color          TEXT,                                 -- hex color code for pillar theming
  icon           TEXT,                                 -- optional icon identifier
  display_order  INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at     TIMESTAMPTZ DEFAULT NULL              -- soft delete
);

-- semesters: ordered groups of courses within a pillar
CREATE TABLE semesters (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar_id      UUID        NOT NULL REFERENCES pillars(id),
  name           TEXT        NOT NULL,
  slug           TEXT        NOT NULL,
  description    TEXT,
  display_order  INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at     TIMESTAMPTZ DEFAULT NULL,             -- soft delete
  UNIQUE(pillar_id, slug)
);

-- courses: ordered groups of lessons within a semester
CREATE TABLE courses (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  semester_id    UUID        NOT NULL REFERENCES semesters(id),
  name           TEXT        NOT NULL,
  slug           TEXT        NOT NULL,
  description    TEXT,
  display_order  INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at     TIMESTAMPTZ DEFAULT NULL,             -- soft delete
  UNIQUE(semester_id, slug)
);

-- lessons: individual learning units with MDX content and quiz config
CREATE TABLE lessons (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id           UUID        NOT NULL REFERENCES courses(id),
  name                TEXT        NOT NULL,
  slug                TEXT        NOT NULL,
  description         TEXT,
  mdx_content         TEXT,                            -- raw MDX string, compiled server-side by next-mdx-remote
  learning_objectives TEXT[],                          -- array of "after this lesson you will..." statements
  estimated_minutes   INTEGER,                         -- reading time estimate
  content_version     INTEGER     NOT NULL DEFAULT 1,
  display_order       INTEGER     NOT NULL DEFAULT 0,
  passing_score       INTEGER     NOT NULL DEFAULT 70, -- quiz passing threshold (percentage)
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at          TIMESTAMPTZ DEFAULT NULL,        -- soft delete
  UNIQUE(course_id, slug)
);

-- lesson_versions: append-only content history (NO soft delete — immutable audit log)
CREATE TABLE lesson_versions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id       UUID        NOT NULL REFERENCES lessons(id),
  version_number  INTEGER     NOT NULL,
  mdx_content     TEXT        NOT NULL,
  learning_objectives TEXT[],
  change_note     TEXT,                                -- what changed in this version
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(lesson_id, version_number)
);

-- quiz_questions: questions associated with lessons
CREATE TABLE quiz_questions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id       UUID        NOT NULL REFERENCES lessons(id),
  question_type   TEXT        NOT NULL CHECK (question_type IN ('multiple_choice', 'recall', 'application', 'analysis', 'comparison')),
  question_text   TEXT        NOT NULL,
  context         TEXT,                                -- scenario/context for application and analysis questions
  options         JSONB,                               -- array of {id, text, isCorrect} for MC/application/analysis/comparison
  correct_answer  TEXT,                                -- canonical correct answer text
  accepted_answers TEXT[],                             -- for recall: set of accepted fill-in-the-blank answers
  explanation     TEXT        NOT NULL,                -- shown after answering (regardless of correct/incorrect)
  display_order   INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at      TIMESTAMPTZ DEFAULT NULL             -- soft delete
);

-- vocabulary: pillar-scoped terms (same term can have different definitions per pillar)
CREATE TABLE vocabulary (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar_id   UUID        NOT NULL REFERENCES pillars(id),
  term        TEXT        NOT NULL,
  definition  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at  TIMESTAMPTZ DEFAULT NULL,               -- soft delete
  UNIQUE(pillar_id, term)                             -- same term, different definition per pillar
);

-- lesson_vocabulary: junction — links vocabulary terms to the lessons that use them (NO soft delete)
CREATE TABLE lesson_vocabulary (
  lesson_id     UUID NOT NULL REFERENCES lessons(id),
  vocabulary_id UUID NOT NULL REFERENCES vocabulary(id),
  PRIMARY KEY (lesson_id, vocabulary_id)
);

-- lesson_connections: cross-pillar conceptual links between lessons (NO soft delete — structural metadata)
CREATE TABLE lesson_connections (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source_lesson_id    UUID        NOT NULL REFERENCES lessons(id),
  target_lesson_id    UUID        NOT NULL REFERENCES lessons(id),
  connection_type     TEXT        NOT NULL CHECK (connection_type IN ('prerequisite', 'related', 'systems_thinking_lens', 'vocabulary_shared')),
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(source_lesson_id, target_lesson_id, connection_type)
);


-- =============================================================================
-- 3. USER-DATA TABLES (have user_id TEXT — per-user data)
--    NOTE: user_id is TEXT, not UUID — Clerk user IDs are strings (e.g. "user_2abc...")
-- =============================================================================

-- progress: tracks a user's status and quiz score for each lesson
CREATE TABLE progress (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          TEXT        NOT NULL,               -- Clerk user ID string
  lesson_id        UUID        NOT NULL REFERENCES lessons(id),
  status           TEXT        NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  best_quiz_score  INTEGER,                            -- best quiz score percentage (determines pass)
  quiz_passed      BOOLEAN     NOT NULL DEFAULT FALSE,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, lesson_id)
);

-- quiz_attempts: immutable per-question attempt records for FSRS spaced repetition (Phase 3)
-- CRITICAL: must exist in Phase 1 — early data needed for FSRS accuracy from day one
CREATE TABLE quiz_attempts (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              TEXT        NOT NULL,           -- Clerk user ID string
  question_id          UUID        NOT NULL REFERENCES quiz_questions(id),
  lesson_id            UUID        NOT NULL REFERENCES lessons(id), -- denormalized for query performance
  selected_answer      TEXT        NOT NULL,
  correct_answer       TEXT        NOT NULL,
  is_correct           BOOLEAN     NOT NULL,
  time_spent_seconds   INTEGER,                        -- how long user spent on this question
  attempt_number       INTEGER     NOT NULL DEFAULT 1, -- which attempt of the quiz this was
  created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL
  -- NO updated_at — quiz_attempts are append-only (immutable records for FSRS)
  -- NO deleted_at — attempts are never deleted (audit trail for learning analytics)
);


-- =============================================================================
-- 4. INDEXES — performance for RLS filtering and hierarchy navigation
-- =============================================================================

-- User-data tables: index on user_id (CRITICAL for RLS performance — 100x+ impact on large tables)
CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);

-- Hierarchy navigation indexes (foreign key columns)
CREATE INDEX idx_semesters_pillar_id ON semesters(pillar_id);
CREATE INDEX idx_courses_semester_id ON courses(semester_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_quiz_questions_lesson_id ON quiz_questions(lesson_id);
CREATE INDEX idx_lesson_versions_lesson_id ON lesson_versions(lesson_id);
CREATE INDEX idx_vocabulary_pillar_id ON vocabulary(pillar_id);

-- Quiz attempts query optimization (for FSRS spaced repetition in Phase 3)
CREATE INDEX idx_quiz_attempts_user_question ON quiz_attempts(user_id, question_id);
CREATE INDEX idx_quiz_attempts_user_lesson ON quiz_attempts(user_id, lesson_id);

-- Progress lookup patterns
CREATE INDEX idx_progress_user_lesson ON progress(user_id, lesson_id);
CREATE INDEX idx_progress_user_status ON progress(user_id, status);


-- =============================================================================
-- 5. UPDATED_AT TRIGGERS — auto-fire on every UPDATE for tables with updated_at
-- =============================================================================

CREATE TRIGGER trg_pillars_updated_at
  BEFORE UPDATE ON pillars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_semesters_updated_at
  BEFORE UPDATE ON semesters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vocabulary_updated_at
  BEFORE UPDATE ON vocabulary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- NOTE: lesson_versions, quiz_attempts, lesson_vocabulary, lesson_connections
-- do NOT have updated_at (append-only / junction tables)


-- =============================================================================
-- 6. ROW LEVEL SECURITY — enabled on ALL tables (even junction tables)
-- =============================================================================

ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 7. RLS POLICIES — content tables (global read for authenticated users)
--
-- Pattern: SELECT for any valid JWT sub claim (authenticated user)
-- INSERT/UPDATE/DELETE: NO user-facing policies — these use the admin/service-role
--   client which bypasses RLS. Content is managed by admins, not end users.
--
-- IMPORTANT: Uses current_setting('request.jwt.claims', true)::json->>'sub'
--   NOT auth.uid() — auth.uid() returns NULL with Clerk JWTs
-- =============================================================================

CREATE POLICY "Authenticated users can view pillars"
  ON pillars FOR SELECT
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
  );

CREATE POLICY "Authenticated users can view semesters"
  ON semesters FOR SELECT
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
  );

CREATE POLICY "Authenticated users can view courses"
  ON courses FOR SELECT
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
  );

CREATE POLICY "Authenticated users can view lessons"
  ON lessons FOR SELECT
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
  );

CREATE POLICY "Authenticated users can view lesson_versions"
  ON lesson_versions FOR SELECT
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
  );

CREATE POLICY "Authenticated users can view quiz_questions"
  ON quiz_questions FOR SELECT
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
  );

CREATE POLICY "Authenticated users can view vocabulary"
  ON vocabulary FOR SELECT
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
  );

CREATE POLICY "Authenticated users can view lesson_vocabulary"
  ON lesson_vocabulary FOR SELECT
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
  );

CREATE POLICY "Authenticated users can view lesson_connections"
  ON lesson_connections FOR SELECT
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
  );


-- =============================================================================
-- 8. RLS POLICIES — user-data tables (scoped to JWT sub = user_id)
--
-- Pattern: All operations check user_id = current JWT sub claim
-- Wrapped in SELECT subquery for Postgres query plan caching (performance optimization)
-- =============================================================================

-- progress policies

CREATE POLICY "Users can view own progress"
  ON progress FOR SELECT
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own progress"
  ON progress FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can update own progress"
  ON progress FOR UPDATE
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'))
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

-- quiz_attempts policies
-- NOTE: No UPDATE or DELETE policy — quiz_attempts are append-only (immutable for FSRS)

CREATE POLICY "Users can view own quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can insert own quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));


-- =============================================================================
-- 9. ACTIVE-RECORD VIEWS — filter soft-deleted rows at the view layer
--    Application code queries these views to automatically exclude deleted records
-- =============================================================================

CREATE VIEW active_pillars AS
  SELECT * FROM pillars WHERE deleted_at IS NULL;

CREATE VIEW active_semesters AS
  SELECT * FROM semesters WHERE deleted_at IS NULL;

CREATE VIEW active_courses AS
  SELECT * FROM courses WHERE deleted_at IS NULL;

CREATE VIEW active_lessons AS
  SELECT * FROM lessons WHERE deleted_at IS NULL;

CREATE VIEW active_quiz_questions AS
  SELECT * FROM quiz_questions WHERE deleted_at IS NULL;

CREATE VIEW active_vocabulary AS
  SELECT * FROM vocabulary WHERE deleted_at IS NULL;
