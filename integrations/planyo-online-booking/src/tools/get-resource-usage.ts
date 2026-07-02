import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let getResourceUsage = SlateTool.create(spec, {
  name: 'Get Resource Usage',
  key: 'get_resource_usage',
  description: `Retrieves usage (occupancy) data for a resource or all resources over a date range. Returns grouped time periods with the number of units occupied in each period. Useful for understanding booking density and remaining availability.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date (e.g. "2024-06-01")'),
      endDate: z.string().describe('End date (e.g. "2024-06-30")'),
      resourceId: z
        .string()
        .optional()
        .describe('Resource ID (omit to get usage for all resources)')
    })
  )
  .output(
    z.object({
      usage: z
        .any()
        .describe('Usage data - grouped time periods with units occupied per period')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.getResourceUsage({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      resourceId: ctx.input.resourceId,
      separatePeriods: true
    });

    return {
      output: {
        usage: result
      },
      message: `Retrieved usage data for ${ctx.input.resourceId ? `resource ${ctx.input.resourceId}` : 'all resources'} from ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  })
  .build();
