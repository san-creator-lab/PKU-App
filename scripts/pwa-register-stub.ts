// Stub for `virtual:pwa-register` used by the single-file demo build
// (vite.artifact.config.ts), which ships without a service worker.
export function registerSW(_options?: unknown): (reload?: boolean) => void {
  return () => {}
}
