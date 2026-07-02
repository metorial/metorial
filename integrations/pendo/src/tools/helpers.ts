import { PendoClient, type PendoRegion } from '../lib/client';
import { pendoServiceError } from '../lib/errors';

type ToolContext = {
  auth: {
    token: string;
    trackEventSharedSecret?: string;
  };
  config: {
    region: PendoRegion;
  };
};

export let createPendoClient = (ctx: ToolContext) =>
  new PendoClient({
    token: ctx.auth.token,
    region: ctx.config.region,
    trackEventSharedSecret: ctx.auth.trackEventSharedSecret
  });

export let validateMultiAppFilter = (input: { appId?: string; expandAll?: boolean }) => {
  if (input.appId && input.expandAll) {
    throw pendoServiceError('Provide either appId or expandAll, not both.');
  }
};

export let asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
};

export let firstPendoRecord = (value: any) => asArray(value)[0] ?? value;

export let requireAtLeastOne = (values: [string, unknown][], actionDescription: string) => {
  if (
    values.every(([, value]) => {
      if (Array.isArray(value)) return value.length === 0;
      return value === undefined || value === null || value === '';
    })
  ) {
    throw pendoServiceError(`Provide at least one of ${actionDescription}.`);
  }
};
