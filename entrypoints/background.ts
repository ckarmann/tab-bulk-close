export default defineBackground(async () => {
  // Reuse existing background runtime during scaffolding.
  await import('../js/background.ts')
})
