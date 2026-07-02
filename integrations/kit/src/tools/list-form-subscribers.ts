import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let formSubscriberSchema = z.object({
  subscriberId: z.number().describe('Subscriber ID'),
  emailAddress: z.string().describe('Subscriber email address'),
  firstName: z.string().nullable().describe('Subscriber first name'),
  state: z.string().describe('Subscriber state'),
  createdAt: z.string().describe('Subscriber creation timestamp'),
  addedAt: z.string().optional().describe('When the subscriber was added to the form')
});

export let listFormSubscribers = SlateTool.create(spec, {
  name: 'List Form Subscribers',
  key: 'list_form_subscribers',
  description: `List subscribers who were added to a specific Kit form or landing page.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.number().describe('Form ID'),
      status: z
        .enum(['active', 'inactive', 'bounced', 'complained', 'cancelled', 'all'])
        .optional()
        .describe('Subscriber status filter'),
      perPage: z.number().optional().describe('Number of results per page (max 1000)'),
      afterCursor: z.string().optional().describe('Pagination cursor to fetch next page'),
      beforeCursor: z.string().optional().describe('Pagination cursor to fetch previous page')
    })
  )
  .output(
    z.object({
      subscribers: z.array(formSubscriberSchema).describe('Form subscribers'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSubscribersForForm(ctx.input.formId, {
      status: ctx.input.status,
      perPage: ctx.input.perPage,
      after: ctx.input.afterCursor,
      before: ctx.input.beforeCursor
    });

    let subscribers = result.data.map(s => ({
      subscriberId: s.id,
      emailAddress: s.email_address,
      firstName: s.first_name,
      state: s.state,
      createdAt: s.created_at,
      addedAt: s.added_at
    }));

    return {
      output: {
        subscribers,
        hasNextPage: result.pagination.has_next_page,
        endCursor: result.pagination.end_cursor
      },
      message: `Found **${subscribers.length}** subscribers for form \`${ctx.input.formId}\`.`
    };
  })
  .build();
