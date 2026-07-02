import { MixpanelClient } from './client';

export let createClientFromContext = (ctx: {
  config: { dataResidency: string; projectId: string };
  auth: {
    serviceAccountUsername?: string;
    serviceAccountSecret?: string;
    projectToken?: string;
  };
}): MixpanelClient => {
  return new MixpanelClient({
    serviceAccountUsername: ctx.auth.serviceAccountUsername,
    serviceAccountSecret: ctx.auth.serviceAccountSecret,
    projectToken: ctx.auth.projectToken,
    projectId: ctx.config.projectId,
    dataResidency: ctx.config.dataResidency as 'us' | 'eu'
  });
};
