import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
      success: z.boolean().describe('Whether the operation succeeded'),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Properties returned from list')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let result = await client.listProperties(ctx.input.prefix);
      let props = result.properties ?? result;
      return {
        output: {
          success: true,
          properties: typeof props === 'object' ? props : {}
        },
        message: `Retrieved environment properties${ctx.input.prefix ? ` with prefix "${ctx.input.prefix}"` : ''}.`
      };
    }

    // upsert
    if (!ctx.input.properties || Object.keys(ctx.input.properties).length === 0) {
      throw new Error('Properties are required for upsert');
    }
    await client.upsertProperties(ctx.input.properties);
    return {
      output: { success: true },
      message: `Upserted **${Object.keys(ctx.input.properties).length}** environment properties.`
    };
  });
