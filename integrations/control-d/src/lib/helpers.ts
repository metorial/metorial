import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { orgId?: string };
}): Client => {
  return new Client({
    token: ctx.auth.token,
    orgId: ctx.config.orgId
  });
};

export let actionLabels: Record<number, string> = {
  0: 'Block',
  1: 'Bypass',
  2: 'Spoof',
  3: 'Redirect'
};

export let actionDescription = (action: number, via?: string): string => {
  let label = actionLabels[action] ?? `Unknown (${action})`;
  if (via) return `${label} via ${via}`;
  return label;
};
