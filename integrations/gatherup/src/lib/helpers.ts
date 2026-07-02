import { Client, type ClientConfig } from './client';

export let createClient = (ctx: {
  auth: { token: string; clientId: string };
  config: { agent?: string };
}): Client => {
  let clientConfig: ClientConfig = {
    token: ctx.auth.token,
    clientId: ctx.auth.clientId,
    agent: ctx.config.agent
  };
  return new Client(clientConfig);
};

/**
 * Parse aggregate response from GatherUp's numbered-field format into an array.
 * GatherUp returns fields like `field1`, `field2`, etc. This normalizes them into arrays.
 */
export let parseAggregateList = <T extends Record<string, unknown>>(
  data: Record<string, unknown>,
  fieldMap: Record<string, string>,
  count?: number
): T[] => {
  let total = count ?? (typeof data.count === 'number' ? data.count : 0);
  let results: T[] = [];

  for (let i = 1; i <= total; i++) {
    let item: Record<string, unknown> = {};
    for (let [outputKey, sourceKey] of Object.entries(fieldMap)) {
      item[outputKey] = data[`${sourceKey}${i}`] ?? data[`${sourceKey}[${i}]`];
    }
    results.push(item as T);
  }

  return results;
};
