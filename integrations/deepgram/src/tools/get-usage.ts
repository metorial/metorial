import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

export let getUsageTool = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Get usage data for a Deepgram project. Filter by date range, API key, tag, method (sync/async/streaming), or model. Useful for monitoring API consumption and billing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      start: z
        .string()
        .optional()
        .describe('Start date in ISO 8601 format (e.g., "2024-01-01T00:00:00Z").'),
      end: z.string().optional().describe('End date in ISO 8601 format.'),
      accessor: z.string().optional().describe('Filter by API key ID.'),
      tag: z.string().optional().describe('Filter by request tag.'),
      method: z
        .string()
        .optional()
        .describe('Filter by method (e.g., "sync", "async", "streaming").'),
      model: z.string().optional().describe('Filter by model name.')
    })
  )
  .output(
    z.object({
      usage: z.any().describe('Usage data breakdown.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getUsage(ctx.input.projectId, {
      start: ctx.input.start,
      end: ctx.input.end,
      accessor: ctx.input.accessor,
      tag: ctx.input.tag,
      method: ctx.input.method,
      model: ctx.input.model
    });

    return {
      output: { usage: result },
      message: `Retrieved usage data for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let getBalancesTool = SlateTool.create(spec, {
  name: 'Get Balances',
  key: 'get_balances',
  description: `Get billing balance information for a Deepgram project. Returns available credits and balance details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.')
    })
  )
  .output(
    z.object({
      balances: z
        .array(
          z.object({
            balanceId: z.string().describe('Unique balance identifier.'),
            amount: z.number().optional().describe('Balance amount.'),
            units: z.string().optional().describe('Balance units.'),
            purchase: z.any().optional().describe('Purchase details.')
          })
        )
        .describe('List of balances.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getBalances(ctx.input.projectId);

    let balances = (result.balances || []).map((b: any) => ({
      balanceId: b.balance_id,
      amount: b.amount,
      units: b.units,
      purchase: b.purchase
    }));

    return {
      output: { balances },
      message: `Found **${balances.length}** balance(s) for project **${ctx.input.projectId}**.`
    };
  })
  .build();
