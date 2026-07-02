import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve usage statistics for the Cloudinary product environment, including storage, bandwidth, transformations, and other resource consumption metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z
        .string()
        .optional()
        .describe(
          'Specific date to get usage for (YYYY-MM-DD format). Defaults to current date.'
        )
    })
  )
  .output(
    z.object({
      plan: z.string().optional().describe('Current plan name.'),
      lastUpdated: z.string().optional().describe('Timestamp of last usage update.'),
      storage: z
        .object({
          usage: z.number().optional().describe('Storage usage in bytes.'),
          limit: z.number().optional().describe('Storage limit in bytes.'),
          usedPercent: z.number().optional().describe('Percentage of storage used.')
        })
        .optional()
        .describe('Storage usage information.'),
      bandwidth: z
        .object({
          usage: z.number().optional().describe('Bandwidth usage in bytes.'),
          limit: z.number().optional().describe('Bandwidth limit in bytes.'),
          usedPercent: z.number().optional().describe('Percentage of bandwidth used.')
        })
        .optional()
        .describe('Bandwidth usage information.'),
      transformations: z
        .object({
          usage: z.number().optional().describe('Number of transformations used.'),
          limit: z.number().optional().describe('Transformation limit.'),
          usedPercent: z.number().optional().describe('Percentage of transformations used.')
        })
        .optional()
        .describe('Transformation usage information.'),
      requests: z.number().optional().describe('Total number of requests.'),
      resources: z.number().optional().describe('Total number of stored resources.'),
      derivedResources: z.number().optional().describe('Total number of derived resources.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let usage = await client.getUsage(ctx.input.date);

    return {
      output: {
        plan: usage.plan,
        lastUpdated: usage.lastUpdated,
        storage: usage.storage,
        bandwidth: usage.bandwidth,
        transformations: usage.transformations,
        requests: usage.requests,
        resources: usage.resources,
        derivedResources: usage.derivedResources
      },
      message: `Usage stats${ctx.input.date ? ` for ${ctx.input.date}` : ''}: **${usage.resources ?? 0}** resources, **${usage.derivedResources ?? 0}** derived resources.`
    };
  })
  .build();
