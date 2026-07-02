import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let usageSchema = z.object({
  month: z.number().describe('Current month number'),
  year: z.number().describe('Current year'),
  calls: z.number().describe('Number of API calls made this period'),
  resetsOn: z.string().describe('Date when the usage counter resets (ISO 8601)')
});

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage Statistics',
  key: 'get_usage',
  description: `Get the number of API calls made during the current billing period. Returns usage counts, total allowed calls, and reset date for Snapshot, VIN, and TrailerID products.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      product: z.enum(['snapshot', 'vin', 'trailer']).describe('Product to get usage for')
    })
  )
  .output(
    z.object({
      usage: usageSchema.describe('Current period usage data'),
      totalCalls: z.number().describe('Total allowed calls per period')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    switch (ctx.input.product) {
      case 'snapshot':
        result = await client.getSnapshotStatistics();
        break;
      case 'vin':
        result = await client.getVinStatistics();
        break;
      case 'trailer':
        result = await client.getTrailerStatistics();
        break;
    }

    let usage = {
      month: result.usage.month,
      year: result.usage.year,
      calls: result.usage.calls,
      resetsOn: result.usage.resets_on
    };

    return {
      output: {
        usage,
        totalCalls: result.total_calls
      },
      message: `**${ctx.input.product}** usage: **${usage.calls}** / **${result.total_calls}** calls this period (resets on ${usage.resetsOn}).`
    };
  })
  .build();
