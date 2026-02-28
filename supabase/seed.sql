-- =============================================================================
-- Seed Data: 7 pillars, sample semesters, courses, and lessons
-- Run via: npx supabase db execute --file supabase/seed.sql
-- Or paste into Supabase SQL Editor
-- =============================================================================

-- 1. PILLARS
INSERT INTO pillars (name, slug, description, color, icon, display_order) VALUES
  ('AI & Agentic Engineering', 'ai-engineering', 'Build intelligent systems — from foundational ML to autonomous agents that reason, plan, and act.', '#3B82F6', 'brain', 1),
  ('Technical Systems', 'technical-systems', 'Master the infrastructure layer — cloud architecture, databases, networking, and DevOps pipelines.', '#10B981', 'server', 2),
  ('Robotics', 'robotics', 'Bridge software and hardware — control systems, sensor fusion, kinematics, and embedded programming.', '#F59E0B', 'robot', 3),
  ('Business', 'business', 'Understand markets, strategy, finance, and the mechanics of building and scaling ventures.', '#8B5CF6', 'briefcase', 4),
  ('Human Behavior', 'human-behavior', 'Explore psychology, decision-making, persuasion, and the science of human motivation.', '#F43F5E', 'brain', 5),
  ('Systems Thinking', 'systems-thinking', 'See the whole — feedback loops, emergent behavior, complex adaptive systems, and mental models.', '#06B6D4', 'network', 6),
  ('Communication', 'communication', 'Write clearly, speak persuasively, and structure arguments that move people to action.', '#64748B', 'message', 7);

-- 2. SEMESTERS (2-3 per pillar for the first 3 pillars, 1 each for the rest)
-- AI & Agentic Engineering
INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Foundations of ML', 'foundations-ml', 'Core machine learning concepts — supervised learning, neural networks, and evaluation.', 1
FROM pillars WHERE slug = 'ai-engineering';

INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Agentic Systems', 'agentic-systems', 'Build autonomous agents with tool use, planning, and multi-step reasoning.', 2
FROM pillars WHERE slug = 'ai-engineering';

INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'LLM Engineering', 'llm-engineering', 'Prompt engineering, fine-tuning, RAG pipelines, and production LLM deployment.', 3
FROM pillars WHERE slug = 'ai-engineering';

-- Technical Systems
INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Cloud Infrastructure', 'cloud-infrastructure', 'AWS, GCP, and cloud-native architectures for scalable systems.', 1
FROM pillars WHERE slug = 'technical-systems';

INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Database Engineering', 'database-engineering', 'SQL, NoSQL, query optimization, and data modeling patterns.', 2
FROM pillars WHERE slug = 'technical-systems';

-- Robotics
INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Control Systems', 'control-systems', 'PID controllers, state-space models, and feedback control theory.', 1
FROM pillars WHERE slug = 'robotics';

INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Sensor Fusion', 'sensor-fusion', 'Combining data from multiple sensors — IMUs, LIDAR, cameras — for robust perception.', 2
FROM pillars WHERE slug = 'robotics';

-- Business
INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Strategy & Markets', 'strategy-markets', 'Competitive strategy, market analysis, and positioning.', 1
FROM pillars WHERE slug = 'business';

-- Human Behavior
INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Decision Making', 'decision-making', 'Cognitive biases, heuristics, and frameworks for better decisions.', 1
FROM pillars WHERE slug = 'human-behavior';

-- Systems Thinking
INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Mental Models', 'mental-models', 'Core mental models from physics, biology, economics, and engineering.', 1
FROM pillars WHERE slug = 'systems-thinking';

-- Communication
INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT id, 'Technical Writing', 'technical-writing', 'Write documentation, proposals, and technical content that people actually read.', 1
FROM pillars WHERE slug = 'communication';

-- 3. COURSES (2-3 per semester for AI pillar to test deep navigation)
-- Foundations of ML courses
INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT s.id, 'Supervised Learning', 'supervised-learning', 'Classification, regression, and the bias-variance tradeoff.', 1
FROM semesters s JOIN pillars p ON s.pillar_id = p.id WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations-ml';

INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT s.id, 'Neural Networks', 'neural-networks', 'From perceptrons to deep networks — backpropagation, activation functions, and architectures.', 2
FROM semesters s JOIN pillars p ON s.pillar_id = p.id WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations-ml';

INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT s.id, 'Model Evaluation', 'model-evaluation', 'Metrics, cross-validation, and avoiding common evaluation pitfalls.', 3
FROM semesters s JOIN pillars p ON s.pillar_id = p.id WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations-ml';

-- Agentic Systems courses
INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT s.id, 'Agent Architectures', 'agent-architectures', 'ReAct, plan-and-execute, and multi-agent patterns.', 1
FROM semesters s JOIN pillars p ON s.pillar_id = p.id WHERE p.slug = 'ai-engineering' AND s.slug = 'agentic-systems';

INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT s.id, 'Tool Use & Function Calling', 'tool-use', 'Teaching agents to use APIs, databases, and external tools.', 2
FROM semesters s JOIN pillars p ON s.pillar_id = p.id WHERE p.slug = 'ai-engineering' AND s.slug = 'agentic-systems';

-- Cloud Infrastructure course
INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT s.id, 'AWS Core Services', 'aws-core', 'EC2, S3, Lambda, and the foundational AWS services.', 1
FROM semesters s JOIN pillars p ON s.pillar_id = p.id WHERE p.slug = 'technical-systems' AND s.slug = 'cloud-infrastructure';

-- Control Systems course
INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT s.id, 'PID Control', 'pid-control', 'Proportional-Integral-Derivative control — theory and tuning.', 1
FROM semesters s JOIN pillars p ON s.pillar_id = p.id WHERE p.slug = 'robotics' AND s.slug = 'control-systems';

-- 4. LESSONS (3-4 per course for Supervised Learning to test full depth)
INSERT INTO lessons (course_id, name, slug, description, estimated_minutes, display_order)
SELECT c.id, 'What is Supervised Learning?', 'what-is-supervised-learning', 'The core idea — learning from labeled examples to make predictions on unseen data.', 12, 1
FROM courses c
JOIN semesters s ON c.semester_id = s.id
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations-ml' AND c.slug = 'supervised-learning';

INSERT INTO lessons (course_id, name, slug, description, estimated_minutes, display_order)
SELECT c.id, 'Linear Regression', 'linear-regression', 'Fitting a line to data — cost functions, gradient descent, and the normal equation.', 20, 2
FROM courses c
JOIN semesters s ON c.semester_id = s.id
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations-ml' AND c.slug = 'supervised-learning';

INSERT INTO lessons (course_id, name, slug, description, estimated_minutes, display_order)
SELECT c.id, 'Classification with Logistic Regression', 'logistic-regression', 'Binary classification, the sigmoid function, and decision boundaries.', 18, 3
FROM courses c
JOIN semesters s ON c.semester_id = s.id
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations-ml' AND c.slug = 'supervised-learning';

INSERT INTO lessons (course_id, name, slug, description, estimated_minutes, display_order)
SELECT c.id, 'Bias-Variance Tradeoff', 'bias-variance', 'Understanding underfitting, overfitting, and the sweet spot in between.', 15, 4
FROM courses c
JOIN semesters s ON c.semester_id = s.id
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations-ml' AND c.slug = 'supervised-learning';

-- Neural Networks lessons
INSERT INTO lessons (course_id, name, slug, description, estimated_minutes, display_order)
SELECT c.id, 'The Perceptron', 'perceptron', 'The simplest neural network — a single neuron that learns a linear boundary.', 10, 1
FROM courses c
JOIN semesters s ON c.semester_id = s.id
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations-ml' AND c.slug = 'neural-networks';

INSERT INTO lessons (course_id, name, slug, description, estimated_minutes, display_order)
SELECT c.id, 'Backpropagation', 'backpropagation', 'How gradients flow backward through the network to update weights.', 25, 2
FROM courses c
JOIN semesters s ON c.semester_id = s.id
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering' AND s.slug = 'foundations-ml' AND c.slug = 'neural-networks';

-- =============================================================================
-- Phase 4: Test quiz questions for quiz engine validation.
-- Run manually: psql < supabase/seed.sql
-- These 5 questions (one per question type) validate Quiz component end-to-end.
-- Requires at least one lesson to exist (uses the first lesson found).
-- =============================================================================

DO $$
DECLARE
  v_lesson_id uuid;
BEGIN
  -- Use the first available lesson to satisfy the foreign key constraint
  SELECT id INTO v_lesson_id FROM lessons ORDER BY created_at LIMIT 1;

  IF v_lesson_id IS NULL THEN
    RAISE NOTICE 'No lessons found — skipping Phase 4 quiz question seed. Run base seed first.';
  ELSE

    -- 1. multiple_choice
    INSERT INTO quiz_questions (lesson_id, question_type, question_text, options, correct_answer, explanation, display_order)
    VALUES (
      v_lesson_id,
      'multiple_choice',
      'What is the primary purpose of a loss function in machine learning?',
      '[{"id":"a","text":"To increase model complexity","isCorrect":false},{"id":"b","text":"To measure the difference between predicted and actual values","isCorrect":true},{"id":"c","text":"To speed up training","isCorrect":false},{"id":"d","text":"To reduce the dataset size","isCorrect":false}]'::jsonb,
      'To measure the difference between predicted and actual values',
      'A loss function quantifies how far the model predictions are from the actual target values. Minimizing this function is the core objective of training.',
      1
    );

    -- 2. recall
    INSERT INTO quiz_questions (lesson_id, question_type, question_text, accepted_answers, correct_answer, explanation, display_order)
    VALUES (
      v_lesson_id,
      'recall',
      'What term describes the process of a neural network adjusting its weights based on the error gradient?',
      ARRAY['backpropagation', 'back propagation', 'back-propagation'],
      'backpropagation',
      'Backpropagation computes the gradient of the loss with respect to each weight by applying the chain rule, propagating error backwards through the network.',
      2
    );

    -- 3. application
    INSERT INTO quiz_questions (lesson_id, question_type, question_text, context, options, correct_answer, explanation, display_order)
    VALUES (
      v_lesson_id,
      'application',
      'A startup has 10,000 customer support tickets and wants to automatically route them to the correct department.',
      'The company has historical data with tickets already labeled by department (billing, technical, account). They want to build a system that reads new tickets and assigns them automatically.',
      '[{"id":"a","text":"Unsupervised clustering","isCorrect":false},{"id":"b","text":"Supervised text classification","isCorrect":true},{"id":"c","text":"Reinforcement learning","isCorrect":false},{"id":"d","text":"Generative adversarial network","isCorrect":false}]'::jsonb,
      'Supervised text classification',
      'Since the company has labeled historical data (tickets with department labels), supervised text classification is the correct approach. The model learns the mapping from ticket text to department labels.',
      3
    );

    -- 4. analysis
    INSERT INTO quiz_questions (lesson_id, question_type, question_text, context, options, correct_answer, explanation, display_order)
    VALUES (
      v_lesson_id,
      'analysis',
      'Examine the training curve below.',
      'A model shows training loss steadily decreasing while validation loss decreases initially then starts increasing after epoch 15. Training accuracy reaches 99% while validation accuracy plateaus at 78%.',
      '[{"id":"a","text":"The model is underfitting","isCorrect":false},{"id":"b","text":"The model is overfitting","isCorrect":true},{"id":"c","text":"The model has converged optimally","isCorrect":false},{"id":"d","text":"The training data is insufficient","isCorrect":false}]'::jsonb,
      'The model is overfitting',
      'The divergence between training and validation metrics after epoch 15 is the classic signature of overfitting. The model has memorized training data patterns that do not generalize to unseen data.',
      4
    );

    -- 5. comparison
    INSERT INTO quiz_questions (lesson_id, question_type, question_text, options, correct_answer, explanation, display_order)
    VALUES (
      v_lesson_id,
      'comparison',
      'How do batch gradient descent and stochastic gradient descent differ in their approach to weight updates?',
      '[{"id":"a","text":"Batch uses all samples per update; SGD uses one sample per update","isCorrect":true},{"id":"b","text":"SGD is always slower than batch","isCorrect":false},{"id":"c","text":"Batch gradient descent cannot find local minima","isCorrect":false},{"id":"d","text":"They produce identical results in all cases","isCorrect":false}]'::jsonb,
      'Batch uses all samples per update; SGD uses one sample per update',
      'Batch gradient descent computes the gradient over the entire dataset before each weight update, while SGD updates weights after each individual sample. SGD is noisier but often faster and can escape shallow local minima.',
      5
    );

    RAISE NOTICE 'Phase 4 quiz questions seeded successfully for lesson_id: %', v_lesson_id;
  END IF;
END;
$$;

-- Agent Architectures lessons
INSERT INTO lessons (course_id, name, slug, description, estimated_minutes, display_order)
SELECT c.id, 'ReAct Pattern', 'react-pattern', 'Reason + Act — interleaving thinking and tool use for complex tasks.', 15, 1
FROM courses c
JOIN semesters s ON c.semester_id = s.id
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering' AND s.slug = 'agentic-systems' AND c.slug = 'agent-architectures';

INSERT INTO lessons (course_id, name, slug, description, estimated_minutes, display_order)
SELECT c.id, 'Multi-Agent Systems', 'multi-agent', 'Coordinating multiple agents — delegation, consensus, and emergent behavior.', 20, 2
FROM courses c
JOIN semesters s ON c.semester_id = s.id
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering' AND s.slug = 'agentic-systems' AND c.slug = 'agent-architectures';
