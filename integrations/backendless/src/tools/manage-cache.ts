import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let manageCache = SlateTool.create(spec, {
  name: 'Manage Cache',
  key: 'manage_cache',
  description: `Manages the Backendless server-side cache. Supports storing, retrieving, checking existence, and deleting cached data by key. Cached values expire after a configurable time-to-live (max 2 hours / 7200 seconds).`,
  constraints: [
    'Maximum TTL is 7200 seconds (2 hours). Default TTL is also 7200 seconds.',
    'Maximum cached value size is 10,240 bytes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['put', 'get', 'delete', 'contains'])
        .describe('Cache operation to perform'),
      cacheKey: z.string().describe('Cache key identifier'),
      cacheValue: z
        .unknown()
        .optional()
        .describe('Value to store in cache (required for "put" operation)'),
      ttlSeconds: z
        .number()
        .optional()
        .describe('Time-to-live in seconds for the cached value (max 7200, default 7200)')
    })
  )
  .output(
    z.object({
      cacheKey: z.string().describe('The cache key'),
      retrievedValue: z
        .unknown()
        .optional()
        .describe('Retrieved value from cache (for "get" operation)'),
      exists: z
        .boolean()
        .optional()
        .describe('Whether the key exists in cache (for "contains" operation)'),
      operationPerformed: z.string().describe('Description of the operation performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    let operationPerformed: string;
    let retrievedValue: unknown;
    let exists: boolean | undefined;

    switch (ctx.input.operation) {
      case 'put':
        await client.putCache(ctx.input.cacheKey, ctx.input.cacheValue, ctx.input.ttlSeconds);
        operationPerformed = `Stored value with TTL ${ctx.input.ttlSeconds || 7200}s`;
        break;
      case 'get':
        retrievedValue = await client.getCache(ctx.input.cacheKey);
        operationPerformed = 'Retrieved cached value';
        break;
      case 'delete':
        await client.deleteCache(ctx.input.cacheKey);
        operationPerformed = 'Deleted cached value';
        break;
      case 'contains':
        exists = await client.cacheContains(ctx.input.cacheKey);
        operationPerformed = `Key ${exists ? 'exists' : 'does not exist'} in cache`;
        break;
    }

    return {
      output: {
        cacheKey: ctx.input.cacheKey,
        retrievedValue,
        exists,
        operationPerformed
      },
      message: `Cache key **${ctx.input.cacheKey}**: ${operationPerformed}.`
    };
  })
  .build();
