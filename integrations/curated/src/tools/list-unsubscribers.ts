import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUnsubscribers = SlateTool.create(spec, {
  name: 'List Unsubscribers',
  key: 'list_unsubscribers',
  description: `List email addresses that have unsubscribed from a publication. Supports pagination for large unsubscriber lists.`,
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
      unsubscribers: z.array(
        z.object({
          subscriberId: z.number().describe('Unique identifier of the unsubscriber'),
          email: z.string().describe('Email address of the unsubscriber'),
          createdAt: z.string().optional().describe('ISO 8601 date of unsubscription')
        })
      ),
      page: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages'),
      totalResults: z.number().optional().describe('Total number of unsubscribers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listUnsubscribers(ctx.input.publicationId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let unsubscriberList = response.unsubscribers || response.data || [];
    let unsubscribers = unsubscriberList.map(sub => ({
      subscriberId: sub.id,
      email: sub.email,
      createdAt: sub.created_at
    }));

    return {
      output: {
        unsubscribers,
        page: response.page,
        totalPages: response.total_pages,
        totalResults: response.total_results
      },
      message: `Found **${response.total_results ?? unsubscribers.length}** unsubscriber(s)${response.page ? ` (page ${response.page}/${response.total_pages})` : ''}.`
    };
  })
  .build();
