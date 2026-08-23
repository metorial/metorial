import { launchDarklyServiceError } from './errors';

export let requireProjectKey = (input: string | undefined, configured: string | undefined) => {
  let projectKey = input ?? configured;
  if (!projectKey) {
    throw launchDarklyServiceError(
      'projectKey is required. Provide it in the tool input or configure a default project key.',
      'launchdarkly_project_key_required'
    );
  }
  return projectKey;
};

export let requireEnvironmentKey = (
  input: string | undefined,
  configured: string | undefined
) => {
  let environmentKey = input ?? configured;
  if (!environmentKey) {
    throw launchDarklyServiceError(
      'environmentKey is required. Provide it in the tool input or configure a default environment key.',
      'launchdarkly_environment_key_required'
    );
  }
  return environmentKey;
};

export let requireInput = (condition: unknown, message: string, reason: string) => {
  if (!condition) throw launchDarklyServiceError(message, reason);
};
