import { RoboflowClient } from './client';

export let createClient = (
  auth: { token: string; workspaceId?: string },
  config: { workspaceId?: string }
) => {
  return new RoboflowClient({
    token: auth.token,
    workspaceId: config.workspaceId || auth.workspaceId
  });
};
