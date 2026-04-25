# Task 0.4: Configure ESLint and Prettier

**Phase:** 0 — Project Scaffolding
**Status:** Not Started
**Depends on:** 0.1

---

## Description

Set up ESLint and Prettier with sensible defaults for a React Native TypeScript project. Keep configuration minimal — only add rules that catch real bugs or enforce consistency.

## Scope

- Install `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`
- Install `prettier` and `eslint-config-prettier`
- Create `.eslintrc.json` extending the recommended configs
- Create `.prettierrc.json` with project formatting rules
- Add `lint` and `format` scripts to `package.json`

## Acceptance Criteria

- [ ] `npm run lint` runs ESLint across `src/` without crashing
- [ ] `npm run format` runs Prettier across `src/`
- [ ] No lint errors on the current (empty/placeholder) codebase
- [ ] TypeScript files are covered by both ESLint and Prettier
