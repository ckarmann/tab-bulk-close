module.exports = {
  forbidden: [
    // Keep domain pure and isolated
    {
      name: 'no-domain-to-ui-app-infra',
      severity: 'error',
      from: { path: '^js/domain' },
      to: { path: '^js/(ui|app|infra|entrypoints|tabs)' },
    },

    // UI should orchestrate via app layer, not infra/domain directly
    {
      name: 'no-ui-to-domain-or-infra',
      severity: 'error',
      from: { path: '^js/ui' },
      to: { path: '^js/(domain|infra)' },
    },

    // Prevent reverse dependency
    {
      name: 'no-app-to-ui',
      severity: 'error',
      from: { path: '^js/app' },
      to: { path: '^js/ui' },
    },

    // Renderers should stay browser-api free
    {
      name: 'no-renderer-to-infra',
      severity: 'error',
      from: { path: '^js/ui/renderers' },
      to: { path: '^js/infra' },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    exclude: '^(.wxt|.output|coverage|dist)',
  },
}