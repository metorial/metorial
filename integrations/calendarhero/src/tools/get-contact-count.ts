import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContactCount = SlateTool.create(spec, {
  name: 'Get Contact Count',
  key: 'get_contact_count',
  description: 'Get the total number of contacts in the connected CalendarHero account.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      count: z.number().describe('Total number of contacts'),
      raw: z.any().optional().describe('Full contact count response')
    })
  )
  .handleInvocation(async ctx => {
    let data = await new Client(ctx.auth.token).getContactCount();
    let value = typeof data === 'object' && data !== null ? (data.count ?? data.total) : data;
    let count = typeof value === 'string' && value.trim() ? Number(value) : value;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      throw createApiServiceError('CalendarHero did not return a valid contact count.');
    }
    return {
      output: { count, raw: data },
      message: `The account has **${count}** contact(s).`
    };
  })
  .build();
