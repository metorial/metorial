import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { downtimeSchema } from '../lib/types';
import { spec } from '../spec';

export let getDowntimes = SlateTool.create(spec, {
  name: 'Get Downtimes',
  key: 'get_downtimes',
  description: `Retrieve the downtime history for a specific monitoring check. Returns all downtime events including error details, timestamps, duration, and whether the downtime was partial (e.g. IPv6-only). Results are paginated with 100 per page.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkToken: z.string().describe('The unique token identifier of the check'),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination (100 results per page, default: 1)')
    })
  )
  .output(
    z.object({
      downtimes: z.array(downtimeSchema).describe('List of downtime events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let downtimes = await client.getDowntimes(ctx.input.checkToken, {
      page: ctx.input.page
    });

    let ongoing = downtimes.filter(d => !d.endedAt).length;
    return {
      output: { downtimes },
      message: `Found **${downtimes.length}** downtime event(s) for check \`${ctx.input.checkToken}\`.${ongoing > 0 ? ` ${ongoing} ongoing.` : ''}`
    };
  })
  .build();
