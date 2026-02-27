// This file is manually maintained to match supabase/migrations/00001_initial_schema.sql
// When a Supabase project is linked (remote or local Docker), replace with:
//   pnpm supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > src/types/database.types.ts
// or:
//   pnpm supabase gen types typescript --local > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// Enums (reproduced from CHECK constraints in schema)
// ============================================================

export type LessonStatus = 'not_started' | 'in_progress' | 'completed'

export type QuestionType =
  | 'multiple_choice'
  | 'recall'
  | 'application'
  | 'analysis'
  | 'comparison'

export type ConnectionType =
  | 'prerequisite'
  | 'related'
  | 'systems_thinking_lens'
  | 'vocabulary_shared'

// ============================================================
// Option type for quiz question options JSONB field
// ============================================================

export interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
}

// ============================================================
// Database type — matches all 11 tables + 6 views
// user_id is string (TEXT) everywhere — Clerk user IDs are not UUIDs
// ============================================================

export interface Database {
  public: {
    Tables: {
      // ----------------------------------------------------------
      // CONTENT TABLES (no user_id — global/authoritative content)
      // ----------------------------------------------------------

      pillars: {
        Row: {
          id: string                   // UUID
          name: string
          slug: string
          description: string | null
          color: string | null         // hex color code
          icon: string | null          // icon identifier
          display_order: number
          created_at: string           // TIMESTAMPTZ as ISO string
          updated_at: string
          deleted_at: string | null    // soft delete
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          color?: string | null
          icon?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string | null
          icon?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }

      semesters: {
        Row: {
          id: string
          pillar_id: string
          name: string
          slug: string
          description: string | null
          display_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          pillar_id: string
          name: string
          slug: string
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          pillar_id?: string
          name?: string
          slug?: string
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semesters_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          }
        ]
      }

      courses: {
        Row: {
          id: string
          semester_id: string
          name: string
          slug: string
          description: string | null
          display_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          semester_id: string
          name: string
          slug: string
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          semester_id?: string
          name?: string
          slug?: string
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          }
        ]
      }

      lessons: {
        Row: {
          id: string
          course_id: string
          name: string
          slug: string
          description: string | null
          mdx_content: string | null   // raw MDX string, compiled server-side by next-mdx-remote
          learning_objectives: string[] | null
          estimated_minutes: number | null
          content_version: number
          display_order: number
          passing_score: number        // quiz passing threshold percentage (default 70)
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          course_id: string
          name: string
          slug: string
          description?: string | null
          mdx_content?: string | null
          learning_objectives?: string[] | null
          estimated_minutes?: number | null
          content_version?: number
          display_order?: number
          passing_score?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          name?: string
          slug?: string
          description?: string | null
          mdx_content?: string | null
          learning_objectives?: string[] | null
          estimated_minutes?: number | null
          content_version?: number
          display_order?: number
          passing_score?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }

      lesson_versions: {
        Row: {
          id: string
          lesson_id: string
          version_number: number
          mdx_content: string
          learning_objectives: string[] | null
          change_note: string | null
          created_at: string
          // NO updated_at — append-only
        }
        Insert: {
          id?: string
          lesson_id: string
          version_number: number
          mdx_content: string
          learning_objectives?: string[] | null
          change_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          version_number?: number
          mdx_content?: string
          learning_objectives?: string[] | null
          change_note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_versions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          }
        ]
      }

      quiz_questions: {
        Row: {
          id: string
          lesson_id: string
          question_type: QuestionType
          question_text: string
          context: string | null
          options: Json | null         // array of QuizOption objects
          correct_answer: string | null
          accepted_answers: string[] | null
          explanation: string
          display_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          lesson_id: string
          question_type: QuestionType
          question_text: string
          context?: string | null
          options?: Json | null
          correct_answer?: string | null
          accepted_answers?: string[] | null
          explanation: string
          display_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          lesson_id?: string
          question_type?: QuestionType
          question_text?: string
          context?: string | null
          options?: Json | null
          correct_answer?: string | null
          accepted_answers?: string[] | null
          explanation?: string
          display_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          }
        ]
      }

      vocabulary: {
        Row: {
          id: string
          pillar_id: string
          term: string
          definition: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          pillar_id: string
          term: string
          definition: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          pillar_id?: string
          term?: string
          definition?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          }
        ]
      }

      lesson_vocabulary: {
        Row: {
          lesson_id: string
          vocabulary_id: string
          // NO timestamps — junction table
        }
        Insert: {
          lesson_id: string
          vocabulary_id: string
        }
        Update: {
          lesson_id?: string
          vocabulary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_vocabulary_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_vocabulary_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "vocabulary"
            referencedColumns: ["id"]
          }
        ]
      }

      lesson_connections: {
        Row: {
          id: string
          source_lesson_id: string
          target_lesson_id: string
          connection_type: ConnectionType
          created_at: string
          // NO soft delete — structural metadata
        }
        Insert: {
          id?: string
          source_lesson_id: string
          target_lesson_id: string
          connection_type: ConnectionType
          created_at?: string
        }
        Update: {
          id?: string
          source_lesson_id?: string
          target_lesson_id?: string
          connection_type?: ConnectionType
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_connections_source_lesson_id_fkey"
            columns: ["source_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_connections_target_lesson_id_fkey"
            columns: ["target_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          }
        ]
      }

      // ----------------------------------------------------------
      // USER-DATA TABLES (have user_id TEXT — per-user data)
      // user_id is string — Clerk user IDs are NOT UUIDs
      // ----------------------------------------------------------

      progress: {
        Row: {
          id: string
          user_id: string              // Clerk user ID (TEXT, not UUID)
          lesson_id: string
          status: LessonStatus
          best_quiz_score: number | null
          quiz_passed: boolean
          started_at: string | null
          completed_at: string | null
          last_accessed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          status?: LessonStatus
          best_quiz_score?: number | null
          quiz_passed?: boolean
          started_at?: string | null
          completed_at?: string | null
          last_accessed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          status?: LessonStatus
          best_quiz_score?: number | null
          quiz_passed?: boolean
          started_at?: string | null
          completed_at?: string | null
          last_accessed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          }
        ]
      }

      quiz_attempts: {
        Row: {
          id: string
          user_id: string              // Clerk user ID (TEXT, not UUID)
          question_id: string
          lesson_id: string            // denormalized for query performance
          selected_answer: string
          correct_answer: string
          is_correct: boolean
          time_spent_seconds: number | null
          attempt_number: number
          created_at: string
          // NO updated_at — append-only (immutable records for FSRS)
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          lesson_id: string
          selected_answer: string
          correct_answer: string
          is_correct: boolean
          time_spent_seconds?: number | null
          attempt_number?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          lesson_id?: string
          selected_answer?: string
          correct_answer?: string
          is_correct?: boolean
          time_spent_seconds?: number | null
          attempt_number?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          }
        ]
      }
    }

    // ----------------------------------------------------------
    // VIEWS — active-record views (soft-delete filtered)
    // ----------------------------------------------------------

    Views: {
      active_pillars: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          color: string | null
          icon: string | null
          display_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Relationships: []
      }

      active_semesters: {
        Row: {
          id: string
          pillar_id: string
          name: string
          slug: string
          description: string | null
          display_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semesters_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          }
        ]
      }

      active_courses: {
        Row: {
          id: string
          semester_id: string
          name: string
          slug: string
          description: string | null
          display_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          }
        ]
      }

      active_lessons: {
        Row: {
          id: string
          course_id: string
          name: string
          slug: string
          description: string | null
          mdx_content: string | null
          learning_objectives: string[] | null
          estimated_minutes: number | null
          content_version: number
          display_order: number
          passing_score: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }

      active_quiz_questions: {
        Row: {
          id: string
          lesson_id: string
          question_type: QuestionType
          question_text: string
          context: string | null
          options: Json | null
          correct_answer: string | null
          accepted_answers: string[] | null
          explanation: string
          display_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          }
        ]
      }

      active_vocabulary: {
        Row: {
          id: string
          pillar_id: string
          term: string
          definition: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          }
        ]
      }
    }

    Functions: Record<string, never>

    Enums: {
      lesson_status: LessonStatus
      question_type: QuestionType
      connection_type: ConnectionType
    }

    CompositeTypes: Record<string, never>
  }
}

// ============================================================
// Convenience type aliases for common usage patterns
// ============================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

// Row type aliases
export type Pillar = Tables<'pillars'>
export type Semester = Tables<'semesters'>
export type Course = Tables<'courses'>
export type Lesson = Tables<'lessons'>
export type LessonVersion = Tables<'lesson_versions'>
export type QuizQuestion = Tables<'quiz_questions'>
export type Vocabulary = Tables<'vocabulary'>
export type LessonVocabulary = Tables<'lesson_vocabulary'>
export type LessonConnection = Tables<'lesson_connections'>
export type Progress = Tables<'progress'>
export type QuizAttempt = Tables<'quiz_attempts'>

// View type aliases
export type ActivePillar = Views<'active_pillars'>
export type ActiveSemester = Views<'active_semesters'>
export type ActiveCourse = Views<'active_courses'>
export type ActiveLesson = Views<'active_lessons'>
export type ActiveQuizQuestion = Views<'active_quiz_questions'>
export type ActiveVocabulary = Views<'active_vocabulary'>
