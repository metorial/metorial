import { BrightspaceClient } from './client';

export let createClient = (
  config: { instanceUrl: string; lpVersion: string; leVersion: string; basVersion: string },
  auth: { token: string }
): BrightspaceClient => {
  return new BrightspaceClient({
    instanceUrl: config.instanceUrl,
    token: auth.token,
    lpVersion: config.lpVersion,
    leVersion: config.leVersion,
    basVersion: config.basVersion
  });
};
