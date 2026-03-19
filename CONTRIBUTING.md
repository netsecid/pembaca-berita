# Contributing to FeedWatch

Thank you for your interest in contributing to FeedWatch! This document describes the development process and coding standards.

## Development Setup

### Prerequisites

- Node.js 20+
- npm 9+
- Git

### Getting Started

```bash
git clone https://github.com/youruser/feedwatch.git
cd feedwatch

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
```

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

## Project Structure

```
feedwatch/
├── backend/         Express + TypeScript API server
│   ├── src/
│   │   ├── db/      SQLite database setup
│   │   ├── routes/  Express route handlers
│   │   └── services/ Business logic
│   └── feeds.json   Default RSS source definitions
└── frontend/        React + Vite + Tailwind UI
    └── src/
        ├── components/  Reusable UI components
        ├── hooks/       Custom React hooks
        ├── pages/       Route page components
        ├── store/       Zustand state stores
        └── types/       TypeScript type definitions
```

## Code Style

### TypeScript

- Use strict TypeScript throughout; avoid `any` types
- Prefer `interface` over `type` for object shapes
- Use explicit return types on exported functions
- Handle all promise rejections — no floating promises

### React

- Use functional components with hooks only
- Keep components focused; extract sub-components when a component exceeds ~150 lines
- Avoid `useEffect` for derived state; compute it inline
- Use `useCallback` for event handlers passed as props

### Backend

- All route handlers must catch errors and return appropriate HTTP status codes
- Database queries should use parameterized statements (never string interpolation)
- Validate all request body fields before processing

### Git Commit Messages

Follow the conventional commits format:

```
<type>(<scope>): <short description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

Examples:
- `feat(ai): add Gemini 1.5 Pro model support`
- `fix(feed): handle malformed pubDate gracefully`
- `docs: update AI provider configuration guide`

## Pull Request Process

1. Fork the repository and create a branch from `main`
2. Name your branch descriptively: `feat/ollama-support`, `fix/date-parsing`
3. Make your changes following the code style guidelines above
4. Ensure the TypeScript compiles without errors: `npm run build`
5. Test your changes manually
6. Open a Pull Request with a clear description of the change and why it's needed
7. Reference any related issues with `Closes #123` in the PR description

## Adding a New AI Provider

1. Add the provider name to `AISettings['provider']` in `frontend/src/types/index.ts`
2. Implement the API call function in `backend/src/services/aiAnalyzer.ts`
3. Add the `case` to the `switch` in `analyzeItem()`
4. Add default models to `PROVIDER_MODELS` in `frontend/src/pages/Settings.tsx`
5. Update the provider button display in the Settings UI

## Adding a New RSS Source

To add a default RSS source for all users, edit `backend/feeds.json` and add an entry:

```json
{
  "id": "unique-numeric-or-uuid-string",
  "name": "Source Display Name",
  "url": "https://example.com/feed.xml",
  "enabled": true
}
```

Users can also add sources at runtime via the Sources page.

## Reporting Issues

When reporting a bug, please include:

- Your FeedWatch version
- Operating system and Node.js version (or Docker version)
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Any relevant error messages or logs

## Feature Requests

Feature requests are welcome. Please open a GitHub Issue describing:

- The use case the feature addresses
- A proposed implementation approach (optional)
- Whether you'd be willing to implement it yourself
