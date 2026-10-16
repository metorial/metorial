import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConferences = SlateTool.create(spec, {
  name: 'List Conferences',
  key: 'list_conferences',
  description: `Retrieves a list of conference rooms (meetings and webinars) from the account. Rooms can be filtered by status. Conference rooms inactive for more than 6 months are automatically archived.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'inactive'])
        .default('active')
        .describe('Filter conferences by status'),
      page: z
        .number()
        .optional()
        .describe(
          'Page number for inactive conferences, starting at 1; the provider returns up to 250 per page'
        )
    })
  )
  .output(
    z.object({
      conferences: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Conference room objects in the returned page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (
      ctx.input.page !== undefined &&
      (!Number.isInteger(ctx.input.page) ||
        ctx.input.page < 1 ||
        ctx.input.status !== 'inactive')
    ) {
      throw createApiServiceError(
        'page must be a positive integer and is supported only for inactive conferences.'
      );
    }
    let conferences = await client.listConferences(ctx.input.status, ctx.input.page);
    let list = conferences;

    return {
      output: { conferences: list },
      message: `Found **${list.length}** ${ctx.input.status} conference(s) in this page.`
    };
  })
  .build();
