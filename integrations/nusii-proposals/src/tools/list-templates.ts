import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve available proposal templates. Templates serve as blueprints whose sections are copied into new proposals when using a templateId.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicTemplates: z
        .boolean()
        .optional()
        .describe('Set to true to return only public templates instead of account templates'),
      page: z.number().optional().describe('Page number (defaults to 1)'),
      perPage: z.number().optional().describe('Number of templates per page (defaults to 25)')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional(),
      totalCount: z.number().optional(),
      templates: z.array(
        z.object({
          templateId: z.string(),
          name: z.string(),
          accountId: z.number().optional(),
          createdAt: z.string(),
          publicTemplate: z.boolean(),
          dummyTemplate: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listTemplates(
      ctx.input.publicTemplates,
      ctx.input.page,
      ctx.input.perPage
    );

    return {
      output: {
        templates: result.items,
        raw: result.raw,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalCount: result.pagination.totalCount
      },
      message: `Found **${result.items.length}** templates.`
    };
  })
  .build();
