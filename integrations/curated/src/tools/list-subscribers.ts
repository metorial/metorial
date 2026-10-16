import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `List current email subscribers for a publication. Supports pagination to retrieve large subscriber lists. Call list_publications to discover the publication ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicationId: publicationIdSchema,
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (default 100, max 500)')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional metadata'),
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

    let subscriberList = response.subscribers ?? response.data!;
    let subscribers = subscriberList.map(sub => ({
      subscriberId: sub.id,
      email: sub.email,
      createdAt: sub.created_at ?? undefined
    }));

    return {
      output: {
        raw: response,
        subscribers,
        page: response.page ?? undefined,
        totalPages: response.total_pages ?? undefined,
        totalResults: response.total_results ?? undefined
      },
      message: `Retrieved **${subscribers.length}** subscriber(s)${response.total_results != null ? ` of ${response.total_results} total` : ''}${response.page != null ? ` (page ${response.page}${response.total_pages != null ? `/${response.total_pages}` : ''})` : ''}.`
    };
  })
  .build();
