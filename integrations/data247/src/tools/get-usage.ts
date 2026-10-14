import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Account Usage',
  key: 'get_usage',
  description:
    'Get query counts and API spend for today, the current month, or the current year, including a breakdown by service. Use this to monitor account consumption and lookup costs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      period: z
        .enum(['today', 'month', 'year'])
        .default('month')
        .describe('Usage period: today, the current month, or the current year')
    })
  )
  .output(
    z.object({
      usage: z
        .record(z.string(), z.unknown())
        .describe('Period dates, total spend, query count, and per-service usage breakdown')
    })
  )
  .handleInvocation(async ctx => {
    let usage = await new Client(ctx.auth.token).getUsage(ctx.input.period);
    return {
      output: { usage },
      message: `Retrieved account usage for **${ctx.input.period}**.`
    };
  })
  .build();
