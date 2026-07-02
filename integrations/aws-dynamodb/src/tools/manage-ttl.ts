import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTtl = SlateTool.create(spec, {
  name: 'Manage TTL',
  key: 'manage_ttl',
  description: `View or configure Time to Live (TTL) settings on a DynamoDB table.
When enabled, items with an expired TTL attribute are automatically deleted. Useful for session data, temporary records, or implementing data retention policies.`,
  instructions: [
    'The TTL attribute must contain a Unix epoch timestamp (seconds since 1970-01-01)',
    'Items with an expired timestamp are typically deleted within 48 hours'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table'),
      action: z.enum(['describe', 'enable', 'disable']).describe('Action to perform'),
      ttlAttributeName: z
        .string()
        .optional()
        .describe('Name of the attribute containing the TTL timestamp (required for enable)')
    })
  )
  .output(
    z.object({
      ttlStatus: z
        .string()
        .describe('Current TTL status (ENABLED, DISABLED, ENABLING, DISABLING)'),
      ttlAttributeName: z.string().optional().describe('The attribute used for TTL')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.action === 'describe') {
      let result = await client.describeTimeToLive(ctx.input.tableName);
      let ttlDesc = result.TimeToLiveDescription;
      return {
        output: {
          ttlStatus: ttlDesc.TimeToLiveStatus || 'DISABLED',
          ttlAttributeName: ttlDesc.AttributeName
        },
        message: `TTL on **${ctx.input.tableName}** is **${ttlDesc.TimeToLiveStatus || 'DISABLED'}**${ttlDesc.AttributeName ? ` (attribute: ${ttlDesc.AttributeName})` : ''}`
      };
    }

    if (!ctx.input.ttlAttributeName && ctx.input.action === 'enable') {
      throw new Error('ttlAttributeName is required when enabling TTL');
    }

    let result = await client.updateTimeToLive({
      tableName: ctx.input.tableName,
      enabled: ctx.input.action === 'enable',
      attributeName: ctx.input.ttlAttributeName || ''
    });

    let ttlSpec = result.TimeToLiveSpecification;

    return {
      output: {
        ttlStatus: ttlSpec.Enabled ? 'ENABLING' : 'DISABLING',
        ttlAttributeName: ttlSpec.AttributeName
      },
      message: `TTL ${ctx.input.action === 'enable' ? 'enabled' : 'disabled'} on **${ctx.input.tableName}** (attribute: ${ttlSpec.AttributeName})`
    };
  })
  .build();
