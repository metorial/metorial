import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getPodcastsByDomain = SlateTool.create(spec, {
  key: 'get_podcasts_by_domain',
  name: 'Get Podcasts by Publisher Domain',
  description:
    'Discover podcasts published by a domain such as npr.org or nytimes.com. Returns up to 10 podcasts per page with pagination information.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      domainName: z
        .string()
        .describe('Publisher domain without a URL scheme or path, for example npr.org.'),
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Page number. Use nextPageNumber from the previous response.')
    })
  )
  .output(
    z.object({
      domainName: z.string(),
      pageNumber: z.number(),
      hasNext: z.boolean(),
      nextPageNumber: z.number(),
      count: z.number().describe('Number of podcasts on this page.'),
      hasPrevious: z.boolean(),
      previousPageNumber: z.number(),
      podcasts: z.array(z.unknown()),
      raw: z.unknown().describe('Complete response with original podcast metadata.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.domainName.trim() || /[\s/:?#]/.test(ctx.input.domainName))
      throw createApiServiceError(
        'Provide a publisher domain such as npr.org, without a URL scheme or path.'
      );
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let data = await client.getPodcastsByDomain({
      domainName: ctx.input.domainName,
      page: ctx.input.page
    });
    return {
      output: {
        domainName: ctx.input.domainName,
        pageNumber: data.page_number,
        hasNext: data.has_next,
        nextPageNumber: data.next_page_number,
        count: data.podcasts.length,
        hasPrevious: data.has_previous,
        previousPageNumber: data.previous_page_number,
        podcasts: data.podcasts,
        raw: data
      },
      message: `Retrieved **${data.podcasts.length}** podcasts for ${ctx.input.domainName}.`
    };
  })
  .build();
