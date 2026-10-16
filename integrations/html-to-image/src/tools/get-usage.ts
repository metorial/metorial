import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage History',
  key: 'get_usage',
  description:
    'Retrieve image usage by hour, day, month, and billing period. Requires usage:read. Calendar series overlap, so do not add them together. This endpoint does not report the current allowance or maximum batch size.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      hourly: z
        .record(z.string(), z.number())
        .describe('Image usage by interval start timestamp'),
      daily: z.record(z.string(), z.number()),
      monthly: z.record(z.string(), z.number()),
      billingPeriods: z.array(
        z.object({
          totalImages: z.number(),
          start: z.string(),
          end: z.string().nullable()
        })
      ),
      raw: z
        .record(z.string(), z.unknown())
        .describe('Provider usage response with credentials removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.getUsage();
    return {
      output: {
        hourly: result.data.hour,
        daily: result.data.day,
        monthly: result.data.month,
        billingPeriods: result.per_billing_period.map(item => ({
          totalImages: item.total_images,
          start: item.start,
          end: item.end
        })),
        raw: result
      },
      message: 'Retrieved image usage history.'
    };
  })
  .build();
