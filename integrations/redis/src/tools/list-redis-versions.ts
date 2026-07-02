import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { redisServiceError } from '../lib/errors';
import { spec } from '../spec';
import { subscriptionTypeSchema } from './common';

let redisVersionSchema = z.object({
  version: z.string().optional().describe('Redis version'),
  eolDate: z.string().optional().describe('End-of-life date'),
  isPreview: z.boolean().optional().describe('Whether this is a preview version'),
  isDefault: z.boolean().optional().describe('Whether this is the default version')
});

export let listRedisVersions = SlateTool.create(spec, {
  name: 'List Redis Versions',
  key: 'list_redis_versions',
  description: `List Redis database versions available for Redis Cloud Pro or Essentials databases. Provide subscriptionId for Essentials and optionally for Pro when checking an existing subscription.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: subscriptionTypeSchema,
      subscriptionId: z
        .number()
        .optional()
        .describe('Subscription ID; required for Essentials and optional for Pro')
    })
  )
  .output(
    z.object({
      redisVersions: z.array(redisVersionSchema).describe('Available Redis versions'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let subscriptionId = ctx.input.subscriptionId;
    let client = new RedisCloudClient(ctx.auth);
    let data: any;
    if (ctx.input.type === 'essentials') {
      if (subscriptionId === undefined) {
        throw redisServiceError(
          'subscriptionId is required to list Essentials Redis versions.'
        );
      }
      data = await client.listEssentialsRedisVersions(subscriptionId);
    } else {
      data = await client.listProRedisVersions(subscriptionId);
    }

    let rawVersions = data?.redisVersions || data?.versions || data || [];
    if (!Array.isArray(rawVersions)) rawVersions = [];
    let redisVersions = rawVersions.map((version: any) => ({
      version: version.version,
      eolDate: version.eolDate,
      isPreview: version.isPreview,
      isDefault: version.isDefault
    }));

    return {
      output: { redisVersions, raw: data },
      message: `Found **${redisVersions.length}** Redis version(s).`
    };
  })
  .build();
