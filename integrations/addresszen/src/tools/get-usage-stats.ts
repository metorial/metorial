import { SlateTool } from 'slates';
import { z } from 'zod';
import { AddressZenClient } from '../lib/client';
import { spec } from '../spec';

export let getUsageStats = SlateTool.create(spec, {
  name: 'Get Usage Statistics',
  key: 'get_usage_stats',
  description: `Retrieve usage statistics and lookup history for an API key. Get daily lookup counts over a date range, or export detailed lookup logs. Useful for monitoring API consumption and auditing lookup history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      apiKey: z.string().describe('The API key to retrieve usage for'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for the usage period (ISO 8601 format, e.g., "2024-01-01")'),
      endDate: z
        .string()
        .optional()
        .describe('End date for the usage period (ISO 8601 format, e.g., "2024-01-31")'),
      tags: z.string().optional().describe('Filter usage by metadata tag'),
      includeLookupLogs: z
        .boolean()
        .default(false)
        .describe('Whether to also retrieve detailed lookup logs (CSV format)')
    })
  )
  .output(
    z.object({
      usage: z.any().optional().describe('Daily usage breakdown with lookup counts per day'),
      lookupLogs: z.string().optional().describe('Lookup logs in CSV format (if requested)'),
      code: z.number().optional().describe('API response code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AddressZenClient({ token: ctx.auth.token });

    let usageResult = await client.getKeyUsage(ctx.input.apiKey, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      tags: ctx.input.tags
    });

    let lookupLogs: string | undefined;
    if (ctx.input.includeLookupLogs) {
      let logsResult = await client.getKeyLookups(ctx.input.apiKey, {
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        tags: ctx.input.tags
      });
      lookupLogs =
        typeof logsResult === 'string'
          ? logsResult
          : logsResult.result || JSON.stringify(logsResult);
    }

    return {
      output: {
        usage: usageResult.result || usageResult,
        lookupLogs,
        code: usageResult.code
      },
      message: `Retrieved usage statistics for API key.${ctx.input.startDate ? ` Period: ${ctx.input.startDate} to ${ctx.input.endDate || 'now'}.` : ''}${lookupLogs ? ' Lookup logs included.' : ''}`
    };
  })
  .build();
