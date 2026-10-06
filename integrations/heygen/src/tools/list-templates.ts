import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List a page of available video templates in your HeyGen account. Returns template IDs and names. Use "Get Template" to see the dynamic variables for a specific template.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      paginationToken: z.string().optional().describe('Cursor returned by a previous page'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum items per page')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template ID'),
            name: z.string().describe('Template name'),
            thumbnailImageUrl: z.string().nullable().describe('Thumbnail image URL')
          })
        )
        .describe('List of available templates'),
      paginationToken: z.string().nullable(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient(ctx.auth);

    let result = await client.listTemplates({
      ...ctx.input,
      token: ctx.input.paginationToken
    });

    return {
      output: { ...result, paginationToken: result.token },
      message: `Found **${result.templates.length}** templates.`
    };
  })
  .build();
