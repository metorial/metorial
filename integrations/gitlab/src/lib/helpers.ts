import { GitLabClient } from './client';
import { gitLabServiceError } from './errors';

export { gitLabServiceError } from './errors';

export let createClient = (
  auth: { token: string; instanceUrl?: string },
  _config?: Record<string, unknown>
) => {
  return new GitLabClient({
    token: auth.token,
    instanceUrl: auth.instanceUrl
  });
};

export let resolveProjectId = (
  inputProjectId: string | undefined,
  configProjectId: string | undefined
) => {
  let projectId = inputProjectId || configProjectId;
  if (!projectId) {
    throw gitLabServiceError(
      'Project ID is required. Provide it as input or set a default projectId in config.'
    );
  }

  return projectId;
};
