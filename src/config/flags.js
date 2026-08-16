// src/config/flags.js
//
// Global feature flags for the application.
//
// USE_CORE_LINE_TOOLS
//   Controls which drawing engine the shell uses once integration (Phase 2) lands.
//   Phase 0-1: scaffold only. This is intentionally `false` so production behavior
//   stays unchanged and the old `src/plugins/line-tools` monolith remains the default.
//   Do not enable until the adapter + registered tool classes are validated.
export const FEATURE_FLAGS = {
  USE_CORE_LINE_TOOLS: true, 
};

/**
 * Convenience getter for the core line-tools flag.
 * @returns {boolean} true when the @mp/line-tools-core engine is enabled.
 */
export const useCoreLineTools = () => FEATURE_FLAGS.USE_CORE_LINE_TOOLS;
