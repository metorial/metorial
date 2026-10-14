import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialerClient } from '../lib/client';
import { spec } from '../spec';
import { dialerCallFiltersSchema } from './get-dialer-call-reports';

export let getDialerCallsCount = SlateTool.create(spec, {
  name: 'Get Dialer Calls Count',
  key: 'get_dialer_calls_count',
  description:
    'Count Power Dialer calls matching a date range and filters without retrieving call records. Returns pagination metadata for planning report requests.',
  instructions: ['Requires a Power Dialer API key.', 'Dates use YYYY-MM-DD format.'],
  tags: { readOnly: true }
})
  .input(dialerCallFiltersSchema)
  .output(
    z.object({
      page: z.number().optional().describe('Current page'),
      pagesCount: z.number().optional().describe('Total pages for the selected page size'),
      totalItems: z.number().describe('Total calls matching the filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialerClient({ apiKey: ctx.auth.dialerToken ?? '' });
    let result = await client.getCallsCount(ctx.input);

    return {
      output: {
        page: result.page,
        pagesCount: result.pagesCount,
        totalItems: result.totalItems
      },
      message: `Found **${result.totalItems}** matching dialer calls from ${ctx.input.dayFrom} to ${ctx.input.dayTo}.`
    };
  })
  .build();
