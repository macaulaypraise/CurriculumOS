# Frontend Guidelines
Version: 1.0

## Stack
- React 18, TypeScript, Vite, Tailwind CSS, React Flow, TanStack Query.

## Design System
- **Theme**: Premium B2B SaaS Dark Mode (`bg-zinc-950`, `border-zinc-800`).
- **Layout**: Persistent SaaS Shell (Left Sidebar, TopNav, Main Content).

## State Management
- **Server State**: TanStack Query (React Query) for all API data.
- **Global UI State**: React Context (API keys, Demo/Live mode toggle).
- **Rule**: NO business logic in React components. Components only render state and dispatch events.
