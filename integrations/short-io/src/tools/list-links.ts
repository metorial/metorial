import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLinks = SlateTool.create(spec, {
  name: 'List Links',
  key: 'list_links',
  description: `List short links for a domain with pagination. Filter by date range, folder, and sort order. Returns links with a pagination token for retrieving subsequent pages.`,
  instructions: [
    'Provide domainId in the input or configure a default in global config.',
    'Use pageToken from a previous response to retrieve the next page of results.'
  ],
  constraints: ['Maximum 150 links per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z
        .number()
        .optional()
        .describe('Domain ID to list links for. Falls back to config default.'),
      limit: z.number().optional().describe('Number of links per page (1-150).'),
      pageToken: z.string().optional().describe('Pagination token from a previous response.'),
      dateSortOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by creation date.'),
      beforeDate: z
        .string()
        .optional()
        .describe('Only return links created before this ISO 8601 date.'),
      afterDate: z
        .string()
        .optional()
        .describe('Only return links created after this ISO 8601 date.'),
      folderId: z.string().optional().describe('Filter by folder ID.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of links returned.'),
      links: z
        .array(
          z.object({
            linkId: z.string().describe('The unique ID of the link.'),
            originalURL: z.string().describe('The destination URL.'),
            shortURL: z.string().describe('The shortened URL.'),
            secureShortURL: z.string().describe('The HTTPS shortened URL.'),
            path: z.string().describe('The slug/path of the short link.'),
            title: z.string().nullable().describe('Title of the link.'),
            tags: z.array(z.string()).nullable().describe('Tags on the link.'),
            archived: z.boolean().describe('Whether the link is archived.'),
            createdAt: z.string().describe('Creation timestamp.')
          })
        )
        .describe('Array of links.'),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for retrieving the next page, null if no more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let domainId = ctx.input.domainId || ctx.config.domainId;
    if (!domainId) {
      throw new Error(
        'Domain ID is required. Provide it in the input or set a default in config.'
      );
    }

    let client = new Client({ token: ctx.auth.token });

    let result = await client.listLinks({
      domainId,
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken,
      dateSortOrder: ctx.input.dateSortOrder,
      beforeDate: ctx.input.beforeDate,
      afterDate: ctx.input.afterDate,
      folderId: ctx.input.folderId
    });

    return {
      output: {
        count: result.count,
        links: result.links.map(link => ({
          linkId: link.idString,
          originalURL: link.originalURL,
          shortURL: link.shortURL,
          secureShortURL: link.secureShortURL,
          path: link.path,
          title: link.title,
          tags: link.tags,
          archived: link.archived,
          createdAt: link.createdAt
        })),
        nextPageToken: result.nextPageToken
      },
      message: `Found **${result.count}** links${result.nextPageToken ? ' (more available)' : ''}`
    };
  })
  .build();
