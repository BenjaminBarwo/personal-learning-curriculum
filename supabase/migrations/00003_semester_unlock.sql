-- Migration: Add manually_unlocked column to semesters table
-- Purpose: Supports PROG-03 manual override to unlock semesters without completing predecessor
-- Single-user platform — boolean column is simpler than a separate per-user table

ALTER TABLE semesters ADD COLUMN IF NOT EXISTS manually_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
