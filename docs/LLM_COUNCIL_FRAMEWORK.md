# The LLM Council Framework

The **LLM Council** is an advanced AI evaluation framework used by engineering and design teams to ensure robust, unbiased, and high-quality outcomes when reviewing code, architecture, or UX flows.

## What is it?
Instead of relying on a single AI's output—which can be subject to bias, hallucinations, or "sycophancy"—the LLM Council framework simulates a "debate" among multiple distinct AI personas.

These personas act as independent domain experts. They critique a given problem, review each other's opinions, and ultimately synthesize their findings into a balanced, comprehensive action plan.

## The Personas
A typical LLM Council consists of:
1. **The Performance Guru:** Scrutinizes load times, rendering strategies, memory leaks, and Web Vitals.
2. **The Accessibility Advocate:** Ensures WCAG compliance, semantic HTML, ARIA standards, and screen-reader testing.
3. **The Security Auditor:** Hunts for vulnerabilities, ensures secure data handling, and validates rate limits or CORS boundaries.
4. **The UX/UI Designer:** Evaluates user journeys, micro-interactions, responsive behavior, and overall aesthetic consistency.
5. **The Chairman:** Synthesizes the individual critiques, resolves conflicting recommendations, and proposes the final action plan.

## The 3-Stage Process
1. **First Opinions (Divergence):** Each expert independently evaluates the codebase or feature without seeing the others' thoughts.
2. **Peer Review (Evaluation):** The experts cross-examine each other's findings. For example, the UX Designer's heavy animation might be challenged by the Performance Guru.
3. **Synthesis (Convergence):** The Chairman aggregates the valid points into a final, actionable summary.

## Usage in this Codebase
When using AI agents (like Claude Code, Antigravity, or others) to review significant pull requests, architecture decisions, or general audits, prompt them to:
> *"Use the LLM Council framework to evaluate this feature/code."*

The agents will automatically adopt these personas, deliberate the pros and cons, and return a highly vetted result.
