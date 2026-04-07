import { vi } from 'vitest'

// Prevent command-module imports from executing browser-specific singletons.
vi.mock('/js/tabs_service.ts', () => ({ default: {} }))
vi.mock('/js/filters.ts', () => ({ default: {} }))
vi.mock('/js/infra/browser/tabs_gateway.ts', () => ({ default: {} }))
vi.mock('/js/infra/browser/windows_gateway.ts', () => ({ default: {} }))
