import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `List current email subscribers for a publication. Supports pagination to retrieve large subscriber lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicationId: z.string().describe('ID of the publication'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (default 100, max 500)')
    })
  )
  .output(
    z.object({
      subscribers: z.array(
        z.object({
          subscriberId: z.number().describe('Unique identifier of the subscriber'),
          email: z.string().describe('Email address of the subscriber'),
          createdAt: z
            .string()
            .optional()
            .describe('ISO 8601 date when the subscriber was added')
        })
      ),
      page: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages'),
      totalResults: z.number().optional().describe('Total number of subscribers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listSubscribers(ctx.input.publicationId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let subscriberList = response.subscribers || response.data || [];
    let subscribers = subscriberList.map(sub => ({
      subscriberId: sub.id,
      email: sub.email,
      createdAt: sub.created_at
    }));

    return {
      output: {
        subscribers,
        page: response.page,
        totalPages: response.total_pages,
        totalResults: response.total_results
      },
      message: `Found **${response.total_results ?? subscribers.length}** subscriber(s)${response.page ? ` (page ${response.page}/${response.total_pages})` : ''}.`
    };
  })
  .build();
