import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
    resolve: {
        alias: {
            '/js': resolve(__dirname, 'js'),
        },
    },
    test: {
        environment: 'node',
        setupFiles: ['tests/setup/vitest.setup.js'],
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: 'coverage',
            include: [
                'js/**/*.{js,ts}',
                'tabs/**/*.{js,ts}',
            ],
            exclude: [
                'js/shared/contracts.{js,ts}',
            ],
        },
    },
})
