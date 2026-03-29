<!-- Add these settings to help agent -->
{
  // Copilot agent behavior
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,
  "github.copilot.chat.reviewSelection.enabled": true,
  "github.copilot.nextEditSuggestions.enabled": true,

  // Keep the agent grounded in your actual files
  "chat.editing.confirmEditRequestRetry": true,
  "workbench.editorAssistants.enabled": true,

  // Reduce noise in agent context (file nesting keeps tree clean)
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "*.ts": "${capture}.js, ${capture}.d.ts, ${capture}.test.ts",
    "*.tsx": "${capture}.test.tsx, ${capture}.stories.tsx",
    "vite.config.*": "vitest.config.*, .env*",
    "package.json": "package-lock.json, yarn.lock, pnpm-lock.yaml, .npmrc"
  },

  // Prevent agent from generating inconsistent imports
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.preferences.autoImportFileExcludePatterns": ["**/node_modules"],

  // Make problems visible immediately (agents miss silent failures)
  "problems.showCurrentInStatus": true,
  "typescript.tsserver.experimental.enableProjectDiagnostics": true
}