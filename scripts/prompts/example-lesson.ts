// Example lesson for few-shot prompting. Uses ACTUAL component patterns from the codebase:
// - <Quiz questionId="..." /> self-closing with UUID (NOT <Quiz><Question>...</Question></Quiz>)
// - <Diagram> with chart prop for inline Mermaid
// All other components match the content-format-standards.md skeleton.

export interface GeneratedQuizQuestion {
  questionType: 'recall' | 'application' | 'analysis' | 'comparison'
  questionText: string
  context: string | null
  options: Array<{ id: string; text: string; isCorrect: boolean }>
  explanation: string
}

export const EXAMPLE_LESSON_MDX = `
<Hook>
  In 1956, John McCarthy coined the term "artificial intelligence" at a Dartmouth workshop, betting that every aspect of human intelligence could be simulated by machines. Six decades later, that bet is paying off in ways even McCarthy didn't anticipate — today's AI systems don't just simulate intelligence, they learn from experience without being explicitly programmed for every task.
</Hook>

<ConceptBlock title="What machine learning actually means">
  Most software works by following rules a programmer writes. Machine learning flips that: instead of writing rules, you give the system thousands of examples and let it figure out the rules itself. Think of it like teaching a child to recognise dogs — you don't give them a taxonomy of fur textures and snout lengths, you just show them enough dogs until the pattern clicks.

  <Definition term="machine learning">A subfield of AI where systems learn patterns from data rather than following hand-coded rules.</Definition>

  The key insight is that **model weights** — the numbers that store what the model has learned — are just a very compressed representation of patterns in the training data. When you run a prediction, the model uses those weights to transform an input into an output.

  <Definition term="model weights">Numerical parameters inside a neural network that encode learned patterns; adjusted during training, fixed during inference.</Definition>
</ConceptBlock>

<Quiz questionId="PLACEHOLDER_UUID_1" />

<ConceptBlock title="Supervised vs unsupervised learning">
  The two dominant flavours of machine learning differ in what you give the algorithm to learn from. In **supervised learning**, every training example has a label — "this email is spam", "this image contains a cat" — so the model learns to predict labels for new examples. In **unsupervised learning**, you hand the model raw data and ask it to find structure on its own: clusters, patterns, anomalies.

  <Definition term="supervised learning">Training a model on labelled examples so it learns to predict labels for new, unseen inputs.</Definition>

  <Definition term="unsupervised learning">Training a model on unlabelled data so it discovers hidden structure or groupings without guidance.</Definition>

  A useful mental model: supervised learning is like studying with an answer key, unsupervised is like reading a library and finding your own themes.
</ConceptBlock>

<Quiz questionId="PLACEHOLDER_UUID_2" />

<ConceptBlock title="How a model learns: gradient descent in plain English">
  Every training loop does the same thing: make a prediction, measure how wrong it was, nudge the weights slightly in the direction that would have made it less wrong, repeat. The "measure how wrong" step uses a **loss function** — a single number that collapses all the errors across the batch into one signal. The "nudge" step is **gradient descent**: calculus tells us which way is downhill on the loss landscape, so we take a small step in that direction.

  <Definition term="loss function">A function that computes a scalar error score for the model's predictions — lower is better.</Definition>

  <Definition term="gradient descent">An optimisation algorithm that iteratively adjusts model weights in the direction that reduces the loss function.</Definition>
</ConceptBlock>

<Diagram chart="graph LR
  A[Training Data] --> B[Forward Pass]
  B --> C[Loss Computation]
  C --> D[Backward Pass / Gradients]
  D --> E[Weight Update]
  E --> B
  style C fill:#f9c,stroke:#333
  style D fill:#cff,stroke:#333" />

<Quiz questionId="PLACEHOLDER_UUID_3" />

<DeepDive title="Why gradient descent works (and when it doesn't)">
  Gradient descent works because loss functions for neural networks are, in practice, smooth enough that following the gradient downhill reliably reaches a good solution — not necessarily the global minimum, but a local minimum that generalises well to new data. This surprised researchers in the 1990s who expected local minima to be a serious problem; empirically, for large networks, most local minima are nearly as good as the global minimum.

  The algorithm breaks down in two common ways. First, if the learning rate — the size of each step — is too large, the optimiser overshoots and the loss bounces around or even diverges. Too small, and training takes forever or gets stuck. Second, if the loss landscape has very flat regions ("plateaus") or saddle points, gradient descent stalls because the gradient signal is near zero.

  Modern optimisers like Adam and AdamW address these problems by adapting the learning rate per parameter based on gradient history — parameters that consistently get large gradients get a smaller learning rate, and vice versa. This adaptive behaviour makes training far more robust across different architectures and datasets.

  The deeper lesson here touches systems thinking: training a neural network is a feedback control problem. The loss is the error signal, the weights are the state, the optimiser is the controller. Framing it this way reveals why stability (not oscillating), responsiveness (not too slow), and steady-state accuracy (generalisation) are the three competing objectives — exactly as they are in any feedback control system.
</DeepDive>

<Exercise estimated="20 min">
  ## Scenario
  You're a product manager at a fintech company. Your engineering team has built a model to flag potentially fraudulent transactions in real time. The model was trained on 12 months of historical transaction data with labels provided by the fraud investigation team. It's been in production for 3 months and the fraud team is complaining that it misses too many novel fraud patterns.

  ## Deliverable
  Write a one-page brief (300–400 words) that: (1) diagnoses why a supervised model trained on historical fraud patterns would struggle with novel fraud, using the vocabulary from this lesson; (2) proposes one concrete change to the training pipeline that could help; (3) identifies what additional data you'd need and why.

  ## Success Criteria
  - Brief correctly identifies the core supervised learning limitation (model can only predict patterns it has seen)
  - Proposal references at least one specific ML concept from the lesson (loss function, gradient descent, training distribution)
  - Data request is specific and justified — not "more data" but "X type of data because Y"
</Exercise>

<Takeaways>
  - Machine learning learns rules from examples rather than following hand-coded rules
  - Model weights store the compressed patterns learned during training
  - Supervised learning requires labelled data; unsupervised learning finds structure without labels
  - Gradient descent iteratively adjusts weights to minimise a loss function
  - New terms: **machine learning**, **model weights**, **supervised learning**, **unsupervised learning**, **loss function**, **gradient descent**
</Takeaways>
`.trim()

export const QUIZ_QUESTION_EXAMPLE: GeneratedQuizQuestion[] = [
  {
    questionType: 'recall',
    questionText: 'What is the primary difference between machine learning and traditional programming?',
    context: null,
    options: [
      { id: 'a', text: 'Machine learning uses faster hardware', isCorrect: false },
      { id: 'b', text: 'Machine learning learns rules from examples rather than following hand-coded rules', isCorrect: true },
      { id: 'c', text: 'Machine learning only works for image recognition tasks', isCorrect: false },
      { id: 'd', text: 'Machine learning requires no training data', isCorrect: false },
    ],
    explanation: 'Traditional programming requires engineers to write explicit rules. Machine learning inverts this: you provide examples and the system derives the rules itself by adjusting model weights during training.',
  },
  {
    questionType: 'comparison',
    questionText: 'A company wants to group its customers by purchasing behaviour without predefined categories. Which learning approach fits this use case?',
    context: 'The company has transaction records but no existing labels for customer segments.',
    options: [
      { id: 'a', text: 'Supervised learning, because there is training data', isCorrect: false },
      { id: 'b', text: 'Unsupervised learning, because there are no labels and the goal is to discover structure', isCorrect: true },
      { id: 'c', text: 'Gradient descent, because it finds the minimum loss', isCorrect: false },
      { id: 'd', text: 'Neither — customer segmentation cannot use machine learning', isCorrect: false },
    ],
    explanation: 'Unsupervised learning is designed exactly for this: finding hidden patterns or clusters in unlabelled data. Supervised learning requires labelled examples, which this scenario lacks.',
  },
  {
    questionType: 'application',
    questionText: 'During training, the loss stops decreasing despite many more iterations. What is the most likely explanation?',
    context: null,
    options: [
      { id: 'a', text: 'The model has too few parameters', isCorrect: false },
      { id: 'b', text: 'The learning rate is too high, causing divergence', isCorrect: false },
      { id: 'c', text: 'The optimiser has reached a plateau or saddle point where gradients are near zero', isCorrect: true },
      { id: 'd', text: 'The model has already achieved 100% accuracy on the training set', isCorrect: false },
    ],
    explanation: 'When loss plateaus during training, the gradient signal is typically near zero — a saddle point or flat region in the loss landscape. Solutions include using adaptive optimisers like Adam, adjusting the learning rate schedule, or checking for data issues.',
  },
]
