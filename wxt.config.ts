import { defineConfig } from 'wxt'

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Tab-Bulk-Closer',
    version: '1.0',
    description: 'Categorize and close tabs easily.',
    icons: {
      16: 'icons/close16.png',
      32: 'icons/close32.png',
      48: 'icons/close48.png',
      128: 'icons/close128.png',
    },
    action: {
      default_title: 'Tab Closer',
      default_icon: 'icons/close48.png',
      // default_area is Firefox-only (places the button in the navbar)
      ...(browser === 'firefox' ? { default_area: 'navbar' } : {}),
    },
    permissions: ['tabs', 'sessions', 'storage', 'unlimitedStorage', 'scripting'],
    // gecko id is required for Firefox signing/identification
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: { id: 'extension@ckarmann.github.com' },
      },
    } : {}),
  }),
})
