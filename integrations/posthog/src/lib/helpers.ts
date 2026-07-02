import { PostHogClient } from './client';

export let createClient = (
  config: { region: string; instanceUrl?: string; projectId?: string },
  auth: { token: string; projectToken?: string }
) => {
  return new PostHogClient({
    token: auth.token,
    projectToken: auth.projectToken,
    region: config.region,
    instanceUrl: config.instanceUrl,
    projectId: config.projectId
  });
};
