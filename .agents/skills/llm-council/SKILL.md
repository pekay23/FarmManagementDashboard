---
name: llm-council
description: Use when the user asks to use the LLM Council framework or when evaluating complex architectural, design, or codebase decisions. The LLM Council involves spawning multiple distinct personas (e.g., Performance, Security, Accessibility, UX) to review the code independently, and then synthesizing their findings into a final consensus.
---

# LLM Council Skill

The LLM Council is an ensemble reasoning framework designed to improve reliability, accuracy, and depth of analysis by simulating a debate among multiple distinct AI personas. 

## When to use
Trigger this skill when:
- The user explicitly asks for an "LLM Council" review or audit.
- You are making high-stakes architectural or design decisions.
- You are conducting a thorough codebase audit and want to ensure no blind spots.

## How to execute the LLM Council Framework

When executing this skill, follow this 3-Stage Workflow within your reasoning and response generation:

### Stage 1: First Opinions (Divergence)
Adopt 3 to 5 distinct expert personas relevant to the user's request. For example:
- **The Performance Guru:** Focuses on speed, bundle size, caching, and optimizations.
- **The Accessibility Advocate:** Focuses on WCAG compliance, semantic HTML, ARIA attributes, and screen-reader compatibility.
- **The Security Auditor:** Focuses on vulnerabilities, input validation, rate limiting, and safe practices.
- **The UX/UI Designer:** Focuses on responsive design, micro-interactions, layout consistency, and aesthetics.
- **The SEO Specialist:** Focuses on metadata, core web vitals, and indexability.

For each persona, write a short, independent critique of the codebase or problem.

### Stage 2: Peer Review (Evaluation)
Have the personas briefly cross-examine the findings. (e.g. The Performance Guru might point out that the UX Designer's heavy animation recommendations will hurt load times).

### Stage 3: Final Synthesis (Convergence)
Adopt the role of the **Chairman**. Review all the critiques and peer reviews, resolve any conflicts, and produce a single, definitive, synthesized report or implementation plan for the user. 

## Output format
Present the final output to the user clearly. You may choose to show the individual council member's findings in an Artifact, followed by the Chairman's final synthesized summary and recommended action plan.
