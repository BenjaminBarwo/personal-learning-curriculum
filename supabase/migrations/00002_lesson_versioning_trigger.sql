-- Migration: Content versioning trigger
-- Automatically captures lesson content into lesson_versions before any update
-- Addresses requirement CONT-04: lesson content is versioned with rollback capability

CREATE OR REPLACE FUNCTION capture_lesson_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only snapshot when mdx_content actually changes AND old content is not null
  -- (prevents inserting NULL into lesson_versions.mdx_content for newly created lessons)
  IF OLD.mdx_content IS NOT NULL
     AND OLD.mdx_content IS DISTINCT FROM NEW.mdx_content THEN
    INSERT INTO lesson_versions (
      lesson_id,
      version_number,
      mdx_content,
      learning_objectives,
      change_note
    ) VALUES (
      OLD.id,
      OLD.content_version,
      OLD.mdx_content,
      OLD.learning_objectives,
      'Auto-versioned before update'
    );
    -- Increment version number on the new record
    NEW.content_version := OLD.content_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lessons_version
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION capture_lesson_version();
