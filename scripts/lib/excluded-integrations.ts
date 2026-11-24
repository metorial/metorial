// Kept in the repo but excluded from the workspace (see root package.json
// "workspaces"), installs, builds, validation and publishing.
const EXCLUDED_INTEGRATION_DIRECTORY = /^super-booble-/;

export const isExcludedIntegrationDirectory = (directoryName: string) =>
  EXCLUDED_INTEGRATION_DIRECTORY.test(directoryName);
