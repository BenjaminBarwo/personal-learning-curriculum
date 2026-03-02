-- =============================================================================
-- Phase 6: Production Seed Data
-- =============================================================================
-- Idempotent: safe to run multiple times against production.
-- All inserts use ON CONFLICT ... DO UPDATE or ON CONFLICT ... DO NOTHING.
--
-- Contents:
--   SECTION 1: 7 Pillar upserts (production names, descriptions, colors)
--   SECTION 2: Pillar 1 hierarchy (Semester "Foundations" + 3 courses)
--   SECTION 3: Lesson 1 — "How Transformers Work" (MDX + 5 quiz questions)
--   SECTION 4: Lesson 2 — "Attention Mechanisms Explained" (MDX + 5 quiz questions)
-- =============================================================================


-- =============================================================================
-- SECTION 1: Pillar Upserts
-- =============================================================================

INSERT INTO pillars (name, slug, description, color, icon, display_order)
VALUES (
  'AI & Agentic Engineering',
  'ai-engineering',
  'The most consequential engineering discipline of our era. This pillar covers how large language models actually work under the hood — transformers, attention mechanisms, tokenization, and inference. You will move from conceptual understanding of neural architectures to practical mastery of agentic workflows: systems where AI autonomously plans, uses tools, and takes multi-step actions in the world. Topics span prompt engineering at a systems level, autonomous agent architectures (ReAct, multi-agent coordination), fine-tuning methods (LoRA, QLoRA, RLHF), and the trajectory of AI capabilities. The goal is architectural understanding deep enough to build on top of these systems — not just tool usage.',
  '#3B82F6',
  'brain',
  1
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  color         = EXCLUDED.color,
  icon          = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at    = NOW();

INSERT INTO pillars (name, slug, description, color, icon, display_order)
VALUES (
  'Technical Systems & Data Infrastructure',
  'technical-systems',
  'The engineering backbone that connects everything else. This pillar covers distributed systems fundamentals — how large-scale software systems are designed for availability, consistency, and fault tolerance. You will learn data pipeline and ETL architecture, machine learning fundamentals (model training, evaluation, and deployment), database design principles, and automation and orchestration patterns. The goal is a systems engineer''s mental model: the ability to reason about trade-offs, diagnose failures, and design infrastructure that scales. This pillar is practical — grounded in how real systems behave under load, across failure modes, and at the intersection with AI and ML workloads.',
  '#10B981',
  'server',
  2
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  color         = EXCLUDED.color,
  icon          = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at    = NOW();

INSERT INTO pillars (name, slug, description, color, icon, display_order)
VALUES (
  'Robotics (Conceptual & Strategic)',
  'robotics',
  'Enough depth to evaluate, direct, and discuss — not hands-on fabrication. This pillar covers how robotic systems work at a high level: sensing, perception, planning, actuation, and control. You will explore the industry landscape and understand where physical automation is heading — the intersection of AI and the physical world that is rapidly closing the gap between digital intelligence and embodied action. Topics include key players and breakthroughs, autonomous vehicle systems, manufacturing robotics, humanoid robot development, and the AI capabilities that power modern robotic decision-making. The goal is strategic fluency: understanding what is possible, what is hard, and how to evaluate claims in a field advancing quickly.',
  '#F59E0B',
  'cpu',
  3
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  color         = EXCLUDED.color,
  icon          = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at    = NOW();

INSERT INTO pillars (name, slug, description, color, icon, display_order)
VALUES (
  'Full-Spectrum Business Competence',
  'business',
  'Hold your own across from a seasoned CFO, operator, or private equity partner. This pillar covers accounting and financial statement fluency, valuation methods and financial modeling, capital structures (debt vs equity, leverage mechanics), acquisition deal mechanics, and operations and process optimization. You will also study growth strategy and go-to-market, legal structures (entities, contracts, IP basics), revenue models and unit economics, leadership and org design, and cash flow management. The goal is not to replace specialists — it is to be the person in the room who understands every function well enough to ask the right questions, spot the risks, and make decisions that hold up under scrutiny.',
  '#8B5CF6',
  'briefcase',
  4
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  color         = EXCLUDED.color,
  icon          = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at    = NOW();

INSERT INTO pillars (name, slug, description, color, icon, display_order)
VALUES (
  'Human Behavior & Power Dynamics',
  'human-behavior',
  'Every lesson grounded in real-world and historical examples — not abstract theory. History is the textbook; frameworks are the lens. This pillar covers incentive design and alignment, negotiation dynamics and frameworks, power asymmetries in complex environments, and persuasion and influence mechanics. You will study how Rockefeller consolidated Standard Oil, how Kissinger used psychology in shuttle diplomacy, how Jobs designed incentive alignment at Apple, and dozens of other case studies drawn from politics, business, and history. The goal is practical intelligence about human systems: understanding why people behave as they do, how power actually moves, and how to navigate complex environments where incentives and information are unequal.',
  '#F43F5E',
  'users',
  5
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  color         = EXCLUDED.color,
  icon          = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at    = NOW();

INSERT INTO pillars (name, slug, description, color, icon, display_order)
VALUES (
  'Systems Thinking (Meta-Pillar)',
  'systems-thinking',
  'The connective tissue across all pillars and the most important competence to develop. This meta-pillar teaches you to understand how complex systems behave — feedback loops, emergent behavior, nonlinear effects, and second and third-order consequences. You will work with mental models including bottleneck theory, leverage points (Donella Meadows), causal loop diagrams, and stock-and-flow thinking. Case studies span the Toyota Production System, Amazon''s flywheel, Chernobyl, and the 2008 financial crisis — systems that succeeded or failed in instructive ways. The goal is the ability to map, model, and stress-test any system — technical, business, or human — and to apply this lens across every other pillar you study.',
  '#06B6D4',
  'git-branch',
  6
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  color         = EXCLUDED.color,
  icon          = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at    = NOW();

INSERT INTO pillars (name, slug, description, color, icon, display_order)
VALUES (
  'Communication & Domain Fluency (Cross-Cutting)',
  'communication',
  'This pillar is baked into all other pillars, not standalone. Precise terminology for each domain is woven into every lesson — not relegated to glossary appendices you will never read. You will develop the ability to code-switch between investors, engineers, operators, and strategic partners — to signal genuine competence in any room. Vocabulary is absorbed in context so it becomes natural usage, not a list of definitions to memorize. The goal is to become the person who can walk into a technical architecture review, a cap table negotiation, a robotics demo, or a systems postmortem and immediately demonstrate that you understand the domain at a working level — not just its surface terminology.',
  '#64748B',
  'message-square',
  7
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  color         = EXCLUDED.color,
  icon          = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at    = NOW();


-- =============================================================================
-- SECTION 2: Pillar 1 Hierarchy — Semester "Foundations" + 3 Courses
-- =============================================================================

-- Semester 1: Foundations (under AI pillar)
INSERT INTO semesters (pillar_id, name, slug, description, display_order)
SELECT
  p.id,
  'Foundations',
  'foundations',
  'The mathematical and architectural foundations that everything in AI builds on. Start here: linear algebra, calculus for deep learning, probability theory, and the neural network architectures that scale from perceptrons to transformers. By the end of this semester you will have the conceptual bedrock and practical PyTorch skills to engage with every more advanced topic in the AI pillar.',
  1
FROM pillars p
WHERE p.slug = 'ai-engineering'
ON CONFLICT (pillar_id, slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at  = NOW();

-- Course 1.1: Mathematical Foundations for AI
INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT
  s.id,
  'Mathematical Foundations for AI',
  'mathematical-foundations-for-ai',
  'The mathematical backbone of modern machine learning. This course covers linear algebra (vectors, matrices, and their operations), calculus for deep learning (derivatives, chain rule, gradients, and backpropagation), probability theory and information theory, and optimization fundamentals including convexity, loss surfaces, and gradient descent. You do not need to be a mathematician — you need to be fluent enough to read papers, debug training, and reason about what is happening inside a model.',
  1
FROM semesters s
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering'
  AND s.slug = 'foundations'
ON CONFLICT (semester_id, slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at  = NOW();

-- Course 1.2: Neural Network Fundamentals
INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT
  s.id,
  'Neural Network Fundamentals',
  'neural-network-fundamentals',
  'From perceptrons to transformers — the essential neural architecture toolkit. This course traces the evolution of neural network design: perceptrons, multi-layer perceptrons, forward and backward passes, loss functions, gradient descent variants (SGD, Adam, RMSprop), regularization techniques (dropout, batch norm, layer norm), and the modern transformer architecture that powers every major language model. Heavy emphasis on understanding why each design decision was made, not just what it does.',
  2
FROM semesters s
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering'
  AND s.slug = 'foundations'
ON CONFLICT (semester_id, slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at  = NOW();

-- Course 1.3: PyTorch Fundamentals
INSERT INTO courses (semester_id, name, slug, description, display_order)
SELECT
  s.id,
  'PyTorch Fundamentals',
  'pytorch-fundamentals',
  'The practical complement to Neural Network Fundamentals. This course covers PyTorch tensor operations, autograd and automatic differentiation, building neural network modules, writing training loops, data loading and preprocessing pipelines, GPU acceleration, and debugging strategies. By the end you will be able to implement any architecture covered in the course from scratch and train it on real data. Capstone: train an MNIST classifier from scratch.',
  3
FROM semesters s
JOIN pillars p ON s.pillar_id = p.id
WHERE p.slug = 'ai-engineering'
  AND s.slug = 'foundations'
ON CONFLICT (semester_id, slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at  = NOW();


-- =============================================================================
-- SECTION 3: Lesson 1 — "How Transformers Work"
-- Pre-computed quiz question UUIDs (fixed for idempotency):
--   v_q1: d290f1ee-6c54-4b01-90e6-d701748f0851
--   v_q2: d290f1ee-6c54-4b01-90e6-d701748f0852
--   v_q3: d290f1ee-6c54-4b01-90e6-d701748f0853
--   v_q4: d290f1ee-6c54-4b01-90e6-d701748f0854
--   v_q5: d290f1ee-6c54-4b01-90e6-d701748f0855
-- =============================================================================

DO $$
DECLARE
  v_course_id uuid;
  v_lesson_id uuid;
  v_q1        uuid := 'd290f1ee-6c54-4b01-90e6-d701748f0851';
  v_q2        uuid := 'd290f1ee-6c54-4b01-90e6-d701748f0852';
  v_q3        uuid := 'd290f1ee-6c54-4b01-90e6-d701748f0853';
  v_q4        uuid := 'd290f1ee-6c54-4b01-90e6-d701748f0854';
  v_q5        uuid := 'd290f1ee-6c54-4b01-90e6-d701748f0855';
  v_mdx       text;
BEGIN

  -- Look up the course
  SELECT c.id INTO v_course_id
  FROM courses c
  JOIN semesters s ON c.semester_id = s.id
  JOIN pillars p   ON s.pillar_id   = p.id
  WHERE p.slug = 'ai-engineering'
    AND s.slug = 'foundations'
    AND c.slug = 'neural-network-fundamentals';

  -- Build the MDX content string using dollar-quoting
  -- Quiz questionIds reference the pre-computed UUIDs above
  v_mdx := $lesson1$
<Hook>
In 2017, a paper with the humble title "Attention Is All You Need" quietly ended a decade of RNN dominance. Eight Google researchers published it on a Friday. By the following year, BERT had set new records on every major NLP benchmark. By 2020, GPT-3 was generating convincing essays, working code, and poetry that fooled experts. By 2023, ChatGPT had crossed 100 million users in two months — faster than any technology product in history.

Every language model you use today runs on the architecture in that 2017 paper. If you want to understand why AI took this particular leap, and why it keeps accelerating, this is where you start.
</Hook>

<ConceptBlock title="Why RNNs Hit a Wall">
Recurrent neural networks were the dominant architecture for sequential data through most of the 2010s. They were genuinely clever: process one token at a time, update a hidden state that carries information forward, and repeat. In theory, the hidden state could carry context from position 1 all the way to position 500.

In practice, it didn't work that well. To understand word 500, the network had to thread information through 499 previous hidden states — and gradients vanished along the way. **Vanishing gradients** meant that early context had almost no influence on later predictions. Long-range dependencies, which are essential for understanding language, became unreliable.

The deeper problem was sequential processing itself. Each token had to finish before the next could start. That meant the GPU — a massively parallel processor designed to do thousands of computations simultaneously — spent most of its time waiting. Training a large RNN was genuinely painful, and making it bigger didn't help as much as you'd hope.
</ConceptBlock>

<Quiz questionId="d290f1ee-6c54-4b01-90e6-d701748f0851" />

<ConceptBlock title="The Transformer's Core Insight">
The transformer made one radical change: throw out sequential processing entirely. Instead of reading tokens one at a time, it looks at all tokens simultaneously and computes relationships between every pair. This is <Definition term="self-attention">A mechanism that allows each position in a sequence to attend to all other positions simultaneously, computing a weighted sum of their representations based on learned relevance scores. The word "cat" can directly query the word "sat" regardless of how many tokens separate them.</Definition>.

The practical superpower isn't just accuracy — it's parallelism. Because all positions are processed at once, the GPU can work on the entire sequence in parallel. This is why transformers train orders of magnitude faster than equivalent RNNs on the same hardware. The hardware industry had already built the right tool; the transformer architecture was designed to use it.

When you hear that a model trained on thousands of GPUs for months, that training is only possible because the architecture is parallelizable. RNNs could never have scaled to GPT-3 scale. The transformer could.
</ConceptBlock>

<Quiz questionId="d290f1ee-6c54-4b01-90e6-d701748f0852" />

<ConceptBlock title="The Encoder-Decoder Architecture">
The original transformer had two components working in sequence. The <Definition term="encoder">The encoder reads the full input sequence simultaneously and produces a rich representation of each token in context of all other tokens. It runs in parallel across all input positions and is used in tasks requiring deep understanding of the input, like classification or translation source processing.</Definition> reads the entire input at once, building a contextual representation of every token. The <Definition term="decoder">The decoder generates output one token at a time, attending to both its own previous outputs (via masked self-attention) and the encoder's representation (via cross-attention). Each generated token depends on all previously generated tokens.</Definition> then generates output one token at a time, using what the encoder produced to guide each step.

This architecture maps naturally to translation: the encoder processes the French sentence in full context; the decoder generates the English translation word by word, consulting the encoder's representation at each step via cross-attention. In the original paper this was the primary application.

Modern models have evolved away from the full encoder-decoder. Some are encoder-only (BERT, RoBERTa) — they excel at understanding tasks like classification and named-entity recognition but can't generate text. Others are decoder-only (GPT, Llama, Claude) — they generate text autoregressively and can do surprisingly well at understanding tasks too. A few remain encoder-decoder (T5, BART) for tasks like summarization and translation.
</ConceptBlock>

<ConceptBlock title="Positional Encoding">
There is a subtle problem with processing all tokens simultaneously: the model has no inherent sense of order. A self-attention mechanism treats "dog bites man" and "man bites dog" identically if you only look at which words are present and not their positions. Order matters in language.

The solution is <Definition term="positional encoding">A vector added to each token's embedding before it enters the transformer, encoding the token's position in the sequence. The original paper used sine and cosine functions of different frequencies, producing a unique signature for each position that the model can use to reconstruct sequence order from what would otherwise be an orderless set of token representations.</Definition>. For each position in the sequence, you compute a vector using sine and cosine functions at different frequencies, then add it to the token embedding. Position 1 gets one signature, position 2 gets a slightly different one, and so on.

This solved what is sometimes called the "bag of words" problem in neural sequence modeling. The transformer can now distinguish "dog bites man" from "man bites dog" because the positional encoding attached to "dog" at position 1 differs from the one attached to "dog" at position 3.
</ConceptBlock>

<Diagram chart="flowchart LR
  A[Input Tokens] --> B[Token Embeddings]
  B --> C[+ Positional Encoding]
  C --> D[Encoder Stack]
  D --> E[Cross-Attention]
  C --> F[Decoder Stack]
  E --> F
  F --> G[Output Tokens]" caption="Transformer encoder-decoder architecture: encoder processes full input in parallel; decoder generates output token by token using cross-attention to consult the encoder." />

<Quiz questionId="d290f1ee-6c54-4b01-90e6-d701748f0853" />

<Quiz questionId="d290f1ee-6c54-4b01-90e6-d701748f0854" />

<Quiz questionId="d290f1ee-6c54-4b01-90e6-d701748f0855" />

<DeepDive title="Beyond the Basics: Positional Encoding and Transfer Learning">
The positional encoding story is more interesting than it first appears. The original Vaswani et al. paper used sinusoidal positional encodings — fixed mathematical functions, not learned parameters. The intuition was that sine and cosine at different frequencies produce unique signatures that generalize to sequence lengths longer than any seen during training, because the functions are defined for any position. The model learns to read these signatures, not to memorize specific positions.

But sinusoidal encoding is not the only approach, and modern models largely moved away from it. BERT introduced learned positional embeddings — trainable parameters for each position, just like word embeddings. This is simpler and often performs better when your training sequences don't exceed a fixed maximum length. GPT-2 and GPT-3 both use learned positional embeddings. The tradeoff is that learned embeddings don't generalize well beyond the positions seen during training, while sinusoidal encodings do.

More recently, rotary positional encoding (RoPE) and ALiBi have become standard in frontier models like Llama and Mistral. RoPE encodes position information directly into the attention computation rather than adding it to embeddings, which makes relative positions between tokens easier for the model to use. This is now the dominant approach for models that need to handle very long contexts — Llama 3 supports 128k token contexts, which would be impractical with fixed-length learned embeddings.

The original paper trained on English-German and English-French translation using the WMT 2014 dataset — roughly 4.5 million sentence pairs. Training took 3.5 days on 8 NVIDIA P100 GPUs. By modern standards this is tiny: GPT-3 trained on 45 terabytes of text over thousands of GPUs for weeks. What the original paper established was not scale but architecture. The insight that attention is sufficient — that you can throw away recurrence entirely — turned out to be one of the most consequential ideas in the history of deep learning. Pre-training a transformer on massive data and fine-tuning for specific tasks (the transfer learning paradigm) became the standard playbook. The same weights that learned language structure on a trillion tokens can be fine-tuned to write code, answer medical questions, or translate poetry — because the representations learned during pre-training are rich enough to generalize.
</DeepDive>

<Exercise>
## Scenario

You are advising an NLP team at a mid-sized company. They have a working LSTM-based text classifier that processes documents up to 512 tokens and achieves decent accuracy. Their lead engineer wants to migrate to a transformer-based architecture for the next version. The engineer has strong RNN experience but has not worked with transformers before.

## Deliverable

Write a one-page technical memo covering: (1) what changes at the architecture level when moving from LSTM to transformer, (2) what stays the same in the training loop, and (3) what new hyperparameters need to be tuned.

## Success Criteria

- Correctly identifies that positional encoding replaces the LSTM's implicit sequence tracking
- Explains why the migration enables parallelization during training
- Names at least 3 transformer-specific hyperparameters (num_heads, num_layers, d_model are the minimum)
- Addresses what stays the same: loss function, optimizer, batch size, learning rate scheduling concepts
</Exercise>

<Takeaways>
- Transformers replaced RNNs by processing all tokens simultaneously via **self-attention** rather than sequentially — enabling GPU parallelism that made large-scale training feasible
- The **encoder** reads the full input in parallel; the **decoder** generates output one token at a time, attending to encoder output via **cross-attention**
- Modern models specialize: encoder-only (BERT) for understanding tasks, decoder-only (GPT, Llama, Claude) for generation, encoder-decoder (T5) for sequence-to-sequence tasks
- **Positional encoding** solves the orderlessness problem — sine/cosine functions or learned embeddings give the model a sense of where each token sits in the sequence
- The transformer's parallelism is why models could scale to billions of parameters; the architecture was designed to use GPU hardware efficiently
- New terms learned: **self-attention**, **cross-attention**, **positional encoding**, **encoder-decoder architecture**, **vanishing gradients**, **transfer learning**
</Takeaways>
$lesson1$;

  -- Insert lesson (idempotent: ON CONFLICT updates content)
  INSERT INTO lessons (
    course_id,
    name,
    slug,
    description,
    mdx_content,
    learning_objectives,
    estimated_minutes,
    display_order
  ) VALUES (
    v_course_id,
    'How Transformers Work',
    'how-transformers-work',
    'Understand the architecture that powers every modern language model — from why RNNs hit their limits to how self-attention, positional encoding, and encoder-decoder structure work together.',
    v_mdx,
    ARRAY[
      'Explain why transformers replaced RNNs for sequence modeling tasks',
      'Describe the encoder-decoder architecture and when each variant (encoder-only, decoder-only) is used',
      'Define self-attention and explain how positional encoding preserves sequence order',
      'Articulate why the transformer architecture enables massively parallel GPU training'
    ],
    7,
    1
  )
  ON CONFLICT (course_id, slug) DO UPDATE SET
    mdx_content         = EXCLUDED.mdx_content,
    estimated_minutes   = EXCLUDED.estimated_minutes,
    learning_objectives = EXCLUDED.learning_objectives,
    content_version     = lessons.content_version + 1,
    updated_at          = NOW()
  RETURNING id INTO v_lesson_id;

  -- Quiz Question 1: multiple_choice — RNN limitation
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q1,
    v_lesson_id,
    'multiple_choice',
    'What fundamental limitation of RNNs did the transformer architecture solve?',
    '[
      {"id":"a","text":"RNNs cannot process variable-length input sequences","isCorrect":false},
      {"id":"b","text":"Sequential token processing prevents parallelization during training","isCorrect":true},
      {"id":"c","text":"RNNs require more labeled data than transformers to train","isCorrect":false},
      {"id":"d","text":"RNNs cannot represent relationships between distant tokens at all","isCorrect":false}
    ]'::jsonb,
    'Sequential token processing prevents parallelization during training',
    'RNNs must process tokens one at a time — each hidden state depends on the previous. This sequential dependency prevents GPU parallelism, making training slow and preventing the scale-up that enabled modern LLMs. Transformers process all positions simultaneously via self-attention, enabling massively parallel training on the same hardware.',
    1
  ) ON CONFLICT (id) DO NOTHING;

  -- Quiz Question 2: application — choosing architecture
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q2,
    v_lesson_id,
    'application',
    'Your team is building a large multilingual document classifier that must process documents up to 1,024 tokens, train on 50 million examples, and run on 64 GPUs. Which architecture should you choose and why?',
    '[
      {"id":"a","text":"LSTM — more proven for classification tasks and requires less memory per token","isCorrect":false},
      {"id":"b","text":"Transformer (encoder-only) — self-attention processes all tokens in parallel, enabling efficient multi-GPU training and capturing long-range dependencies","isCorrect":true},
      {"id":"c","text":"GRU — simpler than both LSTM and transformer with comparable performance","isCorrect":false},
      {"id":"d","text":"Bidirectional RNN — bidirectional context provides better document understanding than transformer","isCorrect":false}
    ]'::jsonb,
    'Transformer (encoder-only) — self-attention processes all tokens in parallel, enabling efficient multi-GPU training and capturing long-range dependencies',
    'At this scale (50M examples, 64 GPUs), training parallelism is decisive. Transformers process all 1,024 positions simultaneously, distributing computation across GPUs efficiently. An encoder-only transformer (like BERT or RoBERTa) is the right variant for classification — it builds rich contextual representations without the overhead of autoregressive decoding. LSTMs would be bottlenecked by sequential processing and scale poorly to this hardware configuration.',
    2
  ) ON CONFLICT (id) DO NOTHING;

  -- Quiz Question 3: recall — self-attention terminology
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    context,
    correct_answer, accepted_answers, explanation, display_order
  ) VALUES (
    v_q3,
    v_lesson_id,
    'recall',
    'What term describes the mechanism that allows each position in a sequence to attend to all other positions simultaneously, computing a weighted sum of their representations?',
    'This mechanism is the core innovation of the transformer architecture, replacing the sequential hidden-state updates of RNNs.',
    'self-attention',
    ARRAY['self-attention', 'self attention', 'Self-Attention', 'Self Attention'],
    'Self-attention (also called intra-attention) allows every token in a sequence to directly query every other token, regardless of distance. The result is a weighted sum of all other positions'' representations, where the weights are learned based on relevance. This eliminates the vanishing-gradient problem for long-range dependencies and enables parallel computation across all positions.',
    3
  ) ON CONFLICT (id) DO NOTHING;

  -- Quiz Question 4: analysis — training convergence
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    context,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q4,
    v_lesson_id,
    'analysis',
    'A research team trains an RNN and a transformer on the same text classification task with identical data and hardware. The transformer converges to a lower loss in 1/4 the wall-clock time. What is the primary architectural reason?',
    'Both models have similar parameter counts. The transformer uses multi-head self-attention; the RNN uses LSTM cells with the same hidden dimension.',
    '[
      {"id":"a","text":"Transformers use better optimizers than RNNs by default","isCorrect":false},
      {"id":"b","text":"The transformer processes all sequence positions in parallel, utilizing the GPU fully, while the LSTM must process positions sequentially","isCorrect":true},
      {"id":"c","text":"Transformers have fewer parameters to update per gradient step","isCorrect":false},
      {"id":"d","text":"Attention mechanisms are mathematically simpler to differentiate than LSTM gating","isCorrect":false}
    ]'::jsonb,
    'The transformer processes all sequence positions in parallel, utilizing the GPU fully, while the LSTM must process positions sequentially',
    'Wall-clock training time is dominated by hardware utilization. LSTMs have a sequential dependency: step N cannot begin until step N-1 completes. On a GPU with thousands of cores, this means most cores are idle most of the time. The transformer''s self-attention processes all positions simultaneously, saturating GPU utilization. With identical hardware and similar parameter counts, the transformer''s parallel architecture is the primary driver of faster convergence in wall-clock time.',
    4
  ) ON CONFLICT (id) DO NOTHING;

  -- Quiz Question 5: comparison — encoder-only vs decoder-only
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q5,
    v_lesson_id,
    'comparison',
    'How do encoder-only and decoder-only transformer architectures differ in their primary use cases?',
    '[
      {"id":"a","text":"Encoder-only models are faster at inference; decoder-only models are more accurate","isCorrect":false},
      {"id":"b","text":"Encoder-only models excel at understanding tasks (classification, NER, embeddings); decoder-only models excel at generation tasks (text completion, code generation, chat)","isCorrect":true},
      {"id":"c","text":"Encoder-only models require more training data; decoder-only models work with fewer examples","isCorrect":false},
      {"id":"d","text":"Encoder-only models use cross-attention; decoder-only models use self-attention","isCorrect":false}
    ]'::jsonb,
    'Encoder-only models excel at understanding tasks (classification, NER, embeddings); decoder-only models excel at generation tasks (text completion, code generation, chat)',
    'The architectural difference determines the use case. Encoder-only models (BERT, RoBERTa) see the full input at once with bidirectional attention — perfect for tasks where you need to understand and classify existing text. Decoder-only models (GPT, Llama, Claude) use causal (left-to-right) attention and are trained to predict the next token — the natural fit for text generation. The masking in decoder-only models prevents attending to future positions, which is what enables autoregressive generation but limits them to left-to-right context.',
    5
  ) ON CONFLICT (id) DO NOTHING;

END;
$$;


-- =============================================================================
-- SECTION 4: Lesson 2 — "Attention Mechanisms Explained"
-- Pre-computed quiz question UUIDs (fixed for idempotency):
--   v_q6:  e390f1ee-7c54-5b01-a0e6-e801748f0861
--   v_q7:  e390f1ee-7c54-5b01-a0e6-e801748f0862
--   v_q8:  e390f1ee-7c54-5b01-a0e6-e801748f0863
--   v_q9:  e390f1ee-7c54-5b01-a0e6-e801748f0864
--   v_q10: e390f1ee-7c54-5b01-a0e6-e801748f0865
-- =============================================================================

DO $$
DECLARE
  v_course_id uuid;
  v_lesson_id uuid;
  v_q6        uuid := 'e390f1ee-7c54-5b01-a0e6-e801748f0861';
  v_q7        uuid := 'e390f1ee-7c54-5b01-a0e6-e801748f0862';
  v_q8        uuid := 'e390f1ee-7c54-5b01-a0e6-e801748f0863';
  v_q9        uuid := 'e390f1ee-7c54-5b01-a0e6-e801748f0864';
  v_q10       uuid := 'e390f1ee-7c54-5b01-a0e6-e801748f0865';
  v_mdx       text;
BEGIN

  -- Look up the course
  SELECT c.id INTO v_course_id
  FROM courses c
  JOIN semesters s ON c.semester_id = s.id
  JOIN pillars p   ON s.pillar_id   = p.id
  WHERE p.slug = 'ai-engineering'
    AND s.slug = 'foundations'
    AND c.slug = 'neural-network-fundamentals';

  -- Build the MDX content string
  v_mdx := $lesson2$
<Hook>
In 2014, Dzmitry Bahdanau was frustrated with a bottleneck that everyone in the field had quietly accepted. Encoder-decoder translation models worked by compressing the entire source sentence into a single fixed-size vector, then generating the translation from that vector. The longer the source sentence, the worse the quality. The model had to remember everything in one place.

Bahdanau's proposal was almost obvious in hindsight: instead of forcing the decoder to use a single summary vector, let it look back at all the encoder states when generating each output word. Weight each encoder state by how relevant it is to the current generation step. This idea — which he called "attention" — improved translation quality on long sentences dramatically. It also planted the seed for the mechanism that would, three years later, become the entire architecture of the transformer.

Today, attention is not just a component — it is the thing. Understanding it at a mechanical level is the key to understanding why language models work at all.
</Hook>

<ConceptBlock title="The Bottleneck Problem">
Before attention, encoder-decoder models had a fundamental design flaw. The encoder processed the entire input sequence and produced a single fixed-size vector — call it the <Definition term="context vector">A single fixed-dimensional vector that an encoder produces by compressing an entire input sequence. In pre-attention architectures, the decoder used only this single vector as its view of the input, creating an information bottleneck: the encoder had to compress everything the decoder might ever need into a fixed number of numbers.</Definition>. The decoder then started from this vector and generated the output.

The problem is obvious once you see it: a single vector has a fixed capacity. A three-word sentence and a three-hundred-word sentence produce the same vector size. The longer the input, the more information gets squeezed out. For short sentences, this worked adequately. For long documents, technical text, or multilingual content, the bottleneck caused the model to "forget" important information from the beginning of the input by the time it finished the encoder.

The model was forced to cram everything into a fixed-capacity container. Attention was the solution: instead of compressing once, the decoder could query the encoder's intermediate states directly — asking "which parts of the input are relevant right now?" at each generation step.
</ConceptBlock>

<ConceptBlock title="Scaled Dot-Product Attention">
The transformer formalized attention into a precise mathematical operation with three ingredients: queries, keys, and values. The names come from information retrieval — think of a database lookup.

Every token in the sequence gets three representations derived by multiplying its embedding by three learned weight matrices: <Definition term="query">A vector derived from the current token that represents what this position is looking for. Like a search query, it is matched against keys to determine which other positions are relevant.</Definition>, <Definition term="key">A vector that represents what a token has to offer. Keys are matched against queries to compute attention scores — how relevant each position is to the current query.</Definition>, and <Definition term="value">The vector that is actually retrieved and aggregated. After attention weights are computed from queries and keys, the output is a weighted sum of value vectors — what the model takes away from the attended positions.</Definition>.

The computation works like this: take the dot product of the query vector with every key vector to get raw attention scores. Divide by the square root of the key dimension (√d_k) to prevent the scores from getting too large. Apply softmax to turn the scores into a probability distribution — attention weights that sum to 1. Multiply each value vector by its weight and sum the results. The output is a weighted blend of all value vectors, where the weights reflect how relevant each position is to the query. The scaling by √d_k is crucial: without it, the dot products grow large as d_k increases, pushing softmax into regions where gradients are extremely small and the model learns slowly.
</ConceptBlock>

<Quiz questionId="e390f1ee-7c54-5b01-a0e6-e801748f0861" />

<ConceptBlock title="Multi-Head Attention">
One attention function can learn one type of relationship. But language is rich — a word relates to others in many ways simultaneously. "Bank" is syntactically a noun, semantically related to money or rivers depending on context, and pragmatically connected to different concepts in different sentences.

<Definition term="multi-head attention">An extension of scaled dot-product attention that runs multiple attention operations in parallel, each with different learned weight matrices. Each head computes its own Q, K, V projections and its own attention pattern, then all head outputs are concatenated and projected through a linear layer. This allows the model to jointly attend to information from different representation subspaces — different types of relationships — at the same position.</Definition> runs h attention functions in parallel, each with its own learned Q, K, V projection matrices. Each "head" learns to attend to different types of relationships. Some heads might focus on adjacent tokens (local syntax), others on coreference (the pronoun "it" attends to the noun it refers to), and others on semantic similarity. The outputs from all heads are concatenated into a single vector and passed through a linear projection layer.

The result is a model that can simultaneously track syntactic structure, semantic content, and discourse-level relationships — something that a single attention head cannot do as richly. In practice, this specialization emerges from training; you do not specify what each head should attend to.
</ConceptBlock>

<Quiz questionId="e390f1ee-7c54-5b01-a0e6-e801748f0862" />

<ConceptBlock title="Self-Attention vs Cross-Attention">
There are two fundamentally different ways to use the attention mechanism, and they serve different purposes.

In **self-attention**, the queries, keys, and values all come from the same sequence. The encoder applies self-attention to the input: each source token attends to every other source token, building a representation of each word in the full context of the sentence. The decoder also uses self-attention on its own outputs — but with a mask that prevents each position from attending to future positions (causal masking), since the decoder generates left-to-right and cannot peek ahead.

<Definition term="cross-attention">An attention operation where queries come from one sequence and keys and values come from a different sequence. In the original transformer, cross-attention lets the decoder query the encoder's output: the decoder's current generation state (query) looks up relevant positions in the encoder's representation (keys and values). This is the mechanism that connects the encoder and decoder — how the decoder "reads" the source.</Definition> connects the decoder to the encoder. Queries come from the decoder (what am I generating now?), and keys and values come from the encoder output (what did the source say?). This is how a translation model knows what French words are relevant when generating each English word.

In modern decoder-only models (GPT, Llama, Claude), there is no cross-attention — these models have no separate encoder. They use only self-attention with causal masking, processing everything in a single stream.
</ConceptBlock>

<ConceptBlock title="Attention in Practice">
The vanilla attention mechanism described above is the foundation, but production systems have evolved it significantly. The core bottleneck is computational: standard attention is O(n²) in sequence length, where n is the number of tokens. For a 4,096-token context, that means ~16 million attention score computations per layer. Scale to 128k tokens and the problem becomes severe.

Flash Attention (Dao et al., 2022) reorders the computation to avoid materializing the full n×n attention matrix in GPU memory, instead computing attention in tiles that fit in fast on-chip SRAM. This gives the same mathematical result but with significantly reduced memory bandwidth requirements — making long-context models practical. Grouped-query attention (GQA), used in Llama 3 and Mistral, shares key and value heads across multiple query heads, reducing the KV cache size during inference. Sliding window attention restricts each token to attending only to nearby positions, enabling efficient processing of very long sequences at the cost of some long-range context.

The attention mechanism remains the most actively researched component of transformer architectures — every efficiency improvement here directly translates to longer context, faster inference, or lower serving cost.
</ConceptBlock>

<Diagram chart="flowchart TD
  A[Input Sequence] --> B[Linear Projections]
  B --> C[Q: Query Matrix]
  B --> D[K: Key Matrix]
  B --> E[V: Value Matrix]
  C --> F[MatMul Q × K^T]
  D --> F
  F --> G[Scale by 1/√d_k]
  G --> H[Softmax → Attention Weights]
  H --> I[MatMul Weights × V]
  E --> I
  I --> J[Attention Output]" caption="Scaled dot-product attention: Q and K produce attention weights via dot-product and softmax; those weights select from V to produce the output." />

<Quiz questionId="e390f1ee-7c54-5b01-a0e6-e801748f0863" />

<Quiz questionId="e390f1ee-7c54-5b01-a0e6-e801748f0864" />

<Quiz questionId="e390f1ee-7c54-5b01-a0e6-e801748f0865" />

<DeepDive title="The Math Behind Attention: Scaling, Specialization, and Efficiency">
The scaling factor 1/√d_k deserves more attention than it usually gets. When the dimension d_k is large (say 64 or 512), the dot products between query and key vectors can become very large in magnitude. This is a consequence of how dot products grow: the sum of d_k multiplied random values has variance proportional to d_k. Push these large values through softmax and you get a distribution that is extremely peaked — almost all the weight on a single position, with near-zero elsewhere. The gradient of a saturated softmax is tiny, making learning very slow. Dividing by √d_k keeps the dot products in a regime where softmax produces more even distributions and gradients flow well. The original paper noticed this empirically and the fix is elegant: one division operation that stabilizes the entire training dynamic.

What do individual attention heads actually learn? Researchers have probed trained transformers by analyzing which positions each head attends to most strongly. The findings are striking: different heads reliably specialize in different linguistic functions. Some heads track syntactic dependencies (verbs attending to their subjects). Some track coreference (pronouns attending to the nouns they refer to). Some attend to adjacent tokens (local n-gram context). Some track semantic similarity across long distances. This specialization is not designed in — it emerges from training on language. The network discovers that distributing different types of pattern recognition across different heads is an efficient use of parameters.

The computational cost of attention — O(n²) in sequence length — has been a central challenge as language models push toward longer and longer contexts. The standard attention matrix for a 100k token sequence has 10 billion entries; materializing it is infeasible. Flash Attention solves this not by approximating attention but by changing the order of computation. Instead of computing the full Q×K^T matrix and then multiplying by V, Flash Attention processes the computation in small blocks that fit in fast GPU SRAM (on-chip memory that is orders of magnitude faster than HBM). The result is mathematically identical to standard attention but uses O(n) memory instead of O(n²), enabling 128k+ token contexts on the same hardware that could barely handle 4k tokens before. This is the kind of systems-level optimization that separates research prototypes from production language models — the math was always there, but making it run efficiently required rethinking how the computation maps to hardware.
</DeepDive>

<Exercise>
## Scenario

Your team has deployed a transformer-based machine translation model that performs well on short sentences but consistently fails on inputs longer than 200 tokens. The model uses standard scaled dot-product attention with a 512-token maximum context length. Performance degradation is gradual: BLEU score drops from 38 at 100 tokens to 22 at 200 tokens, suggesting progressive information loss rather than a hard failure.

## Deliverable

Write a diagnostic analysis covering: (1) identify the likely architectural cause of the degradation, (2) propose two specific architectural changes you would implement, and (3) predict the training-time impact of each change.

## Success Criteria

- Correctly identifies attention weight dilution across long sequences as the primary mechanism (as sequence length grows, each position's attention spreads thinner, reducing signal from the most relevant positions)
- Proposes at least one efficient attention variant from: Flash Attention, sliding window attention, sparse attention, or relative positional encoding
- Acknowledges the accuracy-efficiency tradeoff explicitly — not all fixes are free
- Does not propose simply increasing model size as the primary solution
</Exercise>

<Takeaways>
- Attention was invented to solve the fixed-size **context vector bottleneck** in encoder-decoder models — letting the decoder query all encoder states instead of relying on a single compressed representation
- **Scaled dot-product attention** computes relevance scores via dot products of Q and K, scales by 1/√d_k to prevent softmax saturation, then produces a weighted sum of V vectors
- **Multi-head attention** runs multiple attention functions in parallel with different learned projections, allowing each head to specialize in different types of linguistic relationships
- **Self-attention** queries, keys, and values all come from the same sequence; **cross-attention** uses queries from one sequence and keys/values from another — the mechanism connecting encoder and decoder
- Attention is O(n²) in sequence length; modern optimizations like Flash Attention and grouped-query attention make long-context models practical
- New terms learned: **scaled dot-product attention**, **multi-head attention**, **self-attention**, **cross-attention**, **query/key/value**, **context vector**, **Flash Attention**
</Takeaways>
$lesson2$;

  -- Insert lesson (idempotent: ON CONFLICT updates content)
  INSERT INTO lessons (
    course_id,
    name,
    slug,
    description,
    mdx_content,
    learning_objectives,
    estimated_minutes,
    display_order
  ) VALUES (
    v_course_id,
    'Attention Mechanisms Explained',
    'attention-mechanisms-explained',
    'Understand scaled dot-product attention, multi-head attention, and the difference between self-attention and cross-attention — the core mechanisms inside every transformer.',
    v_mdx,
    ARRAY[
      'Explain the scaled dot-product attention computation: Q, K, V matrices and why scaling by 1/√d_k matters',
      'Describe how multi-head attention allows the model to learn different types of relationships in parallel',
      'Distinguish self-attention from cross-attention and identify where each is used in an encoder-decoder transformer',
      'Name two modern attention efficiency improvements and explain what bottleneck they address'
    ],
    10,
    2
  )
  ON CONFLICT (course_id, slug) DO UPDATE SET
    mdx_content         = EXCLUDED.mdx_content,
    estimated_minutes   = EXCLUDED.estimated_minutes,
    learning_objectives = EXCLUDED.learning_objectives,
    content_version     = lessons.content_version + 1,
    updated_at          = NOW()
  RETURNING id INTO v_lesson_id;

  -- Quiz Question 6: multiple_choice — scaling by sqrt(d_k)
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q6,
    v_lesson_id,
    'multiple_choice',
    'In scaled dot-product attention, why is the dot product of Q and K divided by the square root of d_k?',
    '[
      {"id":"a","text":"To normalize the output to a range between 0 and 1 before applying softmax","isCorrect":false},
      {"id":"b","text":"To prevent dot products from growing too large, which would push softmax into regions with extremely small gradients","isCorrect":true},
      {"id":"c","text":"To reduce computational cost by shrinking the attention score matrix","isCorrect":false},
      {"id":"d","text":"To ensure that attention weights sum to d_k rather than 1","isCorrect":false}
    ]'::jsonb,
    'To prevent dot products from growing too large, which would push softmax into regions with extremely small gradients',
    'Dot product magnitudes grow with d_k because you are summing d_k multiplied values. Large dot products produce a saturated softmax — nearly all probability mass on one position, near-zero elsewhere. The gradient of softmax in this regime is tiny, making learning very slow. Dividing by √d_k keeps dot products in a moderate range where softmax gradients remain substantial and training proceeds efficiently.',
    1
  ) ON CONFLICT (id) DO NOTHING;

  -- Quiz Question 7: comparison — self vs cross attention
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q7,
    v_lesson_id,
    'comparison',
    'What is the key structural difference between self-attention and cross-attention?',
    '[
      {"id":"a","text":"Self-attention uses a softmax function; cross-attention uses a sigmoid function for attention weights","isCorrect":false},
      {"id":"b","text":"Self-attention computes Q, K, and V from the same sequence; cross-attention computes Q from one sequence and K and V from a different sequence","isCorrect":true},
      {"id":"c","text":"Self-attention is used only in the encoder; cross-attention is used only in the decoder","isCorrect":false},
      {"id":"d","text":"Self-attention scales by √d_k; cross-attention does not require scaling","isCorrect":false}
    ]'::jsonb,
    'Self-attention computes Q, K, and V from the same sequence; cross-attention computes Q from one sequence and K and V from a different sequence',
    'The source of Q, K, V matrices defines the attention type. In self-attention, all three come from the same sequence — each position attends to all others in the same input. In cross-attention, Q comes from one sequence (the decoder''s current state) while K and V come from a different sequence (the encoder''s output). Cross-attention is how the decoder reads the source — it lets generation at each step query what the encoder found relevant in the input.',
    2
  ) ON CONFLICT (id) DO NOTHING;

  -- Quiz Question 8: application — debugging long sequence failure
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    context,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q8,
    v_lesson_id,
    'application',
    'A document summarization model consistently ignores information from the beginning of long documents. The model uses standard full attention with a 2,048-token context. Which modification would most directly address the attention-specific cause of this failure?',
    'The model performs well on documents under 500 tokens. Performance degrades as document length increases, particularly for information presented in the first 20% of the document.',
    '[
      {"id":"a","text":"Increase the number of attention heads from 8 to 16","isCorrect":false},
      {"id":"b","text":"Apply relative positional encoding or sliding window attention to maintain sensitivity to all positions without score dilution","isCorrect":true},
      {"id":"c","text":"Add a larger feedforward layer after each attention block","isCorrect":false},
      {"id":"d","text":"Reduce the sequence length to 512 tokens by truncating the document","isCorrect":false}
    ]'::jsonb,
    'Apply relative positional encoding or sliding window attention to maintain sensitivity to all positions without score dilution',
    'As sequence length grows, each token''s attention scores are spread across more positions. With 2,048 tokens, early positions compete with ~2,047 others for attention weight. Without relative positional encoding, the model may learn to discount distant positions. Relative positional encoding (RoPE, ALiBi) or sparse attention patterns (sliding window) help maintain sensitivity to all positions. Simply increasing heads or feedforward size does not address the attention score dilution mechanism causing early-document neglect.',
    3
  ) ON CONFLICT (id) DO NOTHING;

  -- Quiz Question 9: analysis — attention head specialization
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    context,
    options, correct_answer, explanation, display_order
  ) VALUES (
    v_q9,
    v_lesson_id,
    'analysis',
    'Researchers visualize attention weight heatmaps for a trained transformer. They observe that head 3 consistently shows high weights between adjacent tokens, while head 7 shows high weights between pronouns and the nouns they refer to. What does this reveal about multi-head attention?',
    'The model has 12 attention heads per layer. These patterns are consistent across thousands of test examples.',
    '[
      {"id":"a","text":"The model has overfit — well-trained transformers should not show such specialized patterns","isCorrect":false},
      {"id":"b","text":"Different attention heads emerge to specialize in learning distinct types of linguistic relationships through training","isCorrect":true},
      {"id":"c","text":"Heads 3 and 7 are structurally different from the other heads — they were initialized differently","isCorrect":false},
      {"id":"d","text":"Multi-head attention is redundant — one head tracking local syntax and one tracking coreference would be sufficient","isCorrect":false}
    ]'::jsonb,
    'Different attention heads emerge to specialize in learning distinct types of linguistic relationships through training',
    'Head specialization is a well-documented emergent property of multi-head attention. Research by Voita et al. (2019) and Clark et al. (2019) found that individual heads reliably track specific linguistic functions: syntactic dependencies, coreference, positional patterns. This specialization is not designed in — it emerges from training on language. It provides evidence that multi-head attention works by distributing different types of pattern recognition across different parameter subspaces, allowing the model to simultaneously capture multiple types of relationships that single-head attention cannot represent as richly.',
    4
  ) ON CONFLICT (id) DO NOTHING;

  -- Quiz Question 10: recall — Q, K, V matrices
  INSERT INTO quiz_questions (
    id, lesson_id, question_type, question_text,
    context,
    correct_answer, accepted_answers, explanation, display_order
  ) VALUES (
    v_q10,
    v_lesson_id,
    'recall',
    'What are the three matrices computed from the input in the scaled dot-product attention mechanism?',
    'These three matrices are derived by multiplying the input embeddings by three separate learned weight matrices. Their names come from information retrieval.',
    'query, key, value',
    ARRAY['query key value', 'Q K V', 'QKV', 'query, key, value', 'queries keys values', 'query key and value', 'Q, K, V'],
    'In scaled dot-product attention, each input token''s embedding is projected into three vectors: the Query (what this position is looking for), the Key (what this position has to offer for matching), and the Value (the content retrieved after matching). Queries and Keys are compared via dot product to compute attention scores; the resulting weights are applied to Values to produce the attention output. The naming comes from database retrieval: you query a system using a key to retrieve a value.',
    5
  ) ON CONFLICT (id) DO NOTHING;

END;
$$;
