import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { invalid, native } from '../lib/validation';
import { spec } from '../spec';

export let manageEnvironmentPropertiesTool = SlateTool.create(spec, {
  name: 'Manage Environment Properties',
  key: 'manage_environment_properties',
  description: `List or upsert workspace environment properties (key-value pairs). Properties are used for storing configuration values accessible across recipes, such as API URLs, feature flags, and environment-specific settings.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'upsert']).describe('Action to perform'),
      prefix: z.string().optional().describe('Filter properties by key prefix (for list)'),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs to upsert')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Properties returned from list')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    if (ctx.input.action === 'list') {
      const result = await client.listProperties(ctx.input.prefix);
      const properties = native(result, z.record(z.string(), z.string()));
      return {
        output: { success: true, properties },
        message: 'Retrieved properties matching the explicit prefix.'
      };
    }
    if (!ctx.input.properties) invalid('Properties are required for upsert.');
    await client.upsertProperties(ctx.input.properties);
    return {
      output: { success: true },
      message:
        'Properties upsert accepted. No deletion API is provided by this tool; configuration and recipe effects are retained.'
    };
  });
