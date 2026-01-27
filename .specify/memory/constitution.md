<!--
Sync Impact Report:
Version: NEW → 1.0.0 (MINOR: Initial constitution creation)
Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (4 principles: Readability First, Test-Driven Development, Simplicity Over Abstraction, User Experience Priority)
  - Development Standards
  - Quality Gates
  - Governance
Removed Sections: N/A
Templates Status:
  ✅ spec-template.md - Aligned (user stories and acceptance criteria support UX priority)
  ✅ plan-template.md - Aligned (constitution check section will validate against these principles)
  ✅ tasks-template.md - Aligned (test-first workflow and quality gates supported)
Follow-up TODOs: None
-->

# Webform Sample Constitution

## Core Principles

### I. Readability First

Code must be written for humans first, machines second. All code must prioritize clarity and comprehension over cleverness or brevity.

**Rules:**
- Use clear, descriptive names for variables, functions, and types
- Prefer explicit code over implicit behavior
- Include comments for non-obvious logic or business rules
- Maintain consistent formatting and style across the codebase
- Use LF line endings for all files (even on Windows)

**Rationale:** Readable code reduces maintenance burden, accelerates onboarding, and prevents bugs caused by misunderstanding. Code is read far more often than it is written.

### II. Test-Driven Development (NON-NEGOTIABLE)

Testing is mandatory for all features. Tests must be written first and must fail before implementation begins.

**Rules:**
- Tests MUST be written before implementation code
- All tests MUST fail initially (red-green-refactor cycle)
- Test coverage MUST include unit, integration, and contract tests where applicable
- Tests MUST be executed with `bun run test` (NOT `bun test`)
- All tests MUST pass before code review or merge
- BDD tests MUST be executed for all user-facing features

**Rationale:** Test-first development ensures features are designed for testability, validates requirements understanding, and prevents regressions. Skipping tests is unacceptable and leads to quality degradation.

### III. Simplicity Over Abstraction

Design must be simple and direct. Avoid premature optimization and unnecessary abstraction layers.

**Rules:**
- Start with the simplest solution that could work
- Add abstraction only when concrete duplication patterns emerge
- Reject patterns without clear, documented benefits
- Apply YAGNI (You Aren't Gonna Need It) principle rigorously
- Justify all complexity in documentation and code reviews

**Rationale:** Over-engineering creates maintenance burden, increases cognitive load, and often solves problems that never materialize. Simple code is easier to understand, modify, and debug.

### IV. User Experience Priority

All features must be evaluated through the lens of user needs and experience.

**Rules:**
- User stories MUST be prioritized (P1, P2, P3) by value to users
- Each user story MUST be independently testable and deliverable
- Features MUST deliver measurable user value
- User acceptance scenarios MUST be defined before implementation
- Edge cases and error scenarios MUST consider user impact

**Rationale:** Technology exists to serve users. Features that ignore user needs waste resources and create frustration. Prioritization ensures highest-value work happens first.

## Development Standards

### Code Quality

- **Linting**: Execute `bun run lint` for all code changes (includes type checking)
- **Line Endings**: All files MUST use LF line endings (configured in git and editors)
- **Language**: Code comments and documentation may be in Japanese or English based on team preference
- **Formatting**: Consistent formatting enforced by automated tools

### Testing Standards

- **Unit Tests**: Test individual functions/modules in isolation
- **Integration Tests**: Test component interactions and data flow
- **BDD/E2E Tests**: Test complete user scenarios end-to-end
- **Test Execution**: Always use `bun run test` (reads vitest.config.ts correctly)
- **Test Coverage**: Aim for high coverage but prioritize meaningful tests over percentage targets

## Quality Gates

All work must pass these gates before being considered complete:

### Gate 1: Implementation Complete
- [ ] Code written following readability standards
- [ ] All tests written first and initially failed
- [ ] All tests now pass (`bun run test`)
- [ ] Lint and type check pass (`bun run lint`)

### Gate 2: Review Ready
- [ ] Code reviewed for simplicity and lack of over-abstraction
- [ ] User stories validated against acceptance criteria
- [ ] Edge cases and error scenarios documented
- [ ] Build succeeds without errors

### Gate 3: Merge Ready
- [ ] All quality gates passed
- [ ] Documentation updated (if applicable)
- [ ] User experience validated through testing
- [ ] No regressions introduced

## Governance

### Authority

This constitution supersedes all other development practices and guidelines. When conflicts arise, this document takes precedence.

### Amendment Process

1. Proposed amendments MUST be documented with rationale
2. Amendments MUST be reviewed by the team
3. Version number MUST be incremented according to semantic versioning:
   - **MAJOR**: Backward incompatible changes (removing/redefining principles)
   - **MINOR**: New principles or sections added
   - **PATCH**: Clarifications, wording improvements, typo fixes
4. All dependent templates MUST be updated to reflect changes
5. Migration plan MUST be provided for breaking changes

### Compliance

- All pull requests MUST verify compliance with these principles
- Code reviews MUST explicitly check constitution adherence
- Complexity violations MUST be justified in implementation plans
- Quality gates MUST NOT be skipped under any circumstances

### Version Control

**Version**: 1.0.0 | **Ratified**: 2026-01-28 | **Last Amended**: 2026-01-28
