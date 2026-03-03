interface ValidateMdxResult {
  valid: boolean
  errors: string[]
}

// The 6 required structural components per GEN-02.
// Definition, Diagram, and Video are OPTIONAL — not validated here.
const REQUIRED_COMPONENTS = [
  'Hook',
  'ConceptBlock',
  'Quiz',
  'DeepDive',
  'Exercise',
  'Takeaways',
] as const

export async function validateMdx(mdxContent: string): Promise<ValidateMdxResult> {
  const errors: string[] = []

  // Stage 1: Parse check via @mdx-js/mdx compile()
  // Use dynamic import — @mdx-js/mdx is a pure-ESM package; static import causes
  // ERR_PACKAGE_PATH_NOT_EXPORTED in tsx CJS mode due to a transitive dependency (estree-walker).
  try {
    const { compile } = await import('@mdx-js/mdx')
    // jsx: true — accept JSX component tags without requiring imports.
    // Components (Hook, ConceptBlock, etc.) are provided at render time, not import time.
    await compile(mdxContent, { jsx: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    errors.push(`MDX parse error: ${message}`)
    // Return immediately — component presence checks are meaningless on invalid MDX
    return { valid: false, errors }
  }

  // Stage 2: Component presence check
  for (const componentName of REQUIRED_COMPONENTS) {
    // Match opening tag: <ComponentName followed by whitespace, > or /
    const pattern = new RegExp(`<${componentName}[\\s>/]`)
    if (!pattern.test(mdxContent)) {
      errors.push(`Missing required component: <${componentName}>`)
    }
  }

  return { valid: errors.length === 0, errors }
}
