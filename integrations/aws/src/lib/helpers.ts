import { AwsClient } from './client';

export interface AwsContext {
  auth: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  config: {
    region: string;
  };
}

export let clientFromContext = (ctx: AwsContext): AwsClient => {
  return new AwsClient({
    accessKeyId: ctx.auth.accessKeyId,
    secretAccessKey: ctx.auth.secretAccessKey,
    sessionToken: ctx.auth.sessionToken,
    region: ctx.config.region
  });
};

// Flatten EC2 member params for query API
export let flattenParams = (
  prefix: string,
  items: Record<string, string>[]
): Record<string, string> => {
  let params: Record<string, string> = {};
  items.forEach((item, index) => {
    Object.entries(item).forEach(([key, value]) => {
      params[`${prefix}.${index + 1}.${key}`] = value;
    });
  });
  return params;
};

// Flatten a list of values for query API
export let flattenList = (prefix: string, items: string[]): Record<string, string> => {
  let params: Record<string, string> = {};
  items.forEach((item, index) => {
    params[`${prefix}.${index + 1}`] = item;
  });
  return params;
};
