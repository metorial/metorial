import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List all Paperform forms accessible by the authenticated user. Supports searching by title and pagination. Use this to discover available forms, check submission counts, or find a specific form by name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search forms by title'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100, default 20)'),
      skip: z.number().optional().describe('Number of results to skip for pagination'),
      sort: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort direction by creation date (default DESC)')
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.string().describe('Unique form ID'),
          slug: z.string().describe('Form slug'),
          customSlug: z.string().nullable().describe('Custom slug if set'),
          title: z.string().nullable().describe('Form title'),
          description: z.string().nullable().describe('Form description'),
          url: z.string().describe('Form sharing URL'),
          live: z.boolean().describe('Whether the form is accepting submissions'),
          submissionCount: z.number().describe('Total number of submissions'),
          spaceId: z.number().describe('Space ID containing the form'),
          tags: z.array(z.string()).nullable().describe('Tags assigned to the form'),
          createdAt: z.string().describe('Creation timestamp (UTC)'),
          updatedAt: z.string().describe('Last update timestamp (UTC)')
        })
      ),
      total: z.number().describe('Total number of forms matching the query'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listForms({
      search: ctx.input.search,
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      sort: ctx.input.sort
    });

    let forms = result.results.map(f => ({
      formId: f.id,
      slug: f.slug,
      customSlug: f.custom_slug,
      title: f.title,
      description: f.description,
      url: f.url,
      live: f.live,
      submissionCount: f.submission_count,
      spaceId: f.space_id,
      tags: f.tags,
      createdAt: f.created_at_utc,
      updatedAt: f.updated_at_utc
    }));

    return {
      output: {
        forms,
        total: result.total,
        hasMore: result.has_more
      },
      message: `Found **${result.total}** form(s). Returned **${forms.length}** result(s).${result.has_more ? ' More results available.' : ''}`
    };
  })
  .build();
