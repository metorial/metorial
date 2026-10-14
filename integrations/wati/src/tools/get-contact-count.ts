import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContactCount = SlateTool.create(spec, {
  name: 'Get Contact Count',
  key: 'get_contact_count',
  description:
    'Get the number of Wati contacts, optionally filtering by a creation date range.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      dateFrom: z.string().optional().describe('Start date for the contact creation range.'),
      dateTo: z.string().optional().describe('End date for the contact creation range.')
    })
  )
  .output(
    z.object({ count: z.number().describe('Number of contacts in the requested range.') })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiEndpoint: ctx.config.apiEndpoint });
    let result = await client.getContactCount(ctx.input);
    if (
      typeof result?.contact_count !== 'number' ||
      !Number.isInteger(result.contact_count) ||
      result.contact_count < 0
    ) {
      throw createApiServiceError('Wati returned no valid contact count.');
    }
    return {
      output: { count: result.contact_count },
      message: `Found **${result.contact_count}** contacts.`
    };
  })
  .build();
