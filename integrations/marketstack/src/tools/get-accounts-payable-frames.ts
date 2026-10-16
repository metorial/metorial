import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, record } from '../lib/client';
import { spec } from '../spec';

export let getAccountsPayableFrames = SlateTool.create(spec, {
  key: 'get_accounts_payable_frames',
  name: 'Get Accounts Payable Frames',
  description:
    'Get the latest SEC AccountsPayableCurrent fact per reporting entity for a calendar frame, using the documented US-GAAP accounts-payable API. Returns company identities and reported values in the original frame data.',
  constraints: ['Available on Business plans.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      unit: z.string().describe('XBRL unit such as USD or USD-per-shares.'),
      period: z
        .string()
        .describe('Calendar frame: CY2023, CY2023Q1, or CY2023Q1I for an instant.'),
      limit: z.number().optional().describe('Page size from 1 to 1000.'),
      offset: z.number().optional().describe('Non-negative pagination offset.')
    })
  )
  .output(
    z.object({
      frame: z.record(z.string(), z.unknown()),
      pagination: z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        count: z.number().optional(),
        total: z.number().optional()
      }),
      raw: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getAccountsPayableFrames({
      ...ctx.input,
      taxonomy: 'us-gaap',
      tag: 'AccountsPayableCurrent'
    });
    return {
      output: {
        frame: record(record(result.raw).data),
        pagination: result.pagination,
        raw: result.raw
      },
      message: `Retrieved accounts payable frame ${ctx.input.period}.`
    };
  })
  .build();
