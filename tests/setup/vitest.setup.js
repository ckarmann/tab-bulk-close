import { vi } from 'vitest'

// Prevent command-module imports from executing browser-specific singletons.
vi.mock('/js/tabs_service.js', () => ({ default: {} }))
vi.mock('/js/filters.js', () => ({ default: {} }))
vi.mock('/js/infra/browser/tabs_gateway.js', () => ({ default: {} }))
vi.mock('/js/infra/browser/windows_gateway.js', () => ({ default: {} }))
