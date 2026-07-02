import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve all design templates belonging to the authenticated user. Results can be sorted by creation or last update date in ascending or descending order.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sort: z
        .enum(['createdAt', 'updatedAt'])
        .optional()
        .describe('Field to sort templates by. Defaults to updatedAt.'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order. Defaults to desc.')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique template identifier'),
            name: z.string().describe('Template name'),
            createdAt: z.string().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().describe('ISO 8601 last update timestamp')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTemplates({
      sort: ctx.input.sort,
      order: ctx.input.order
    });

    let templates = Array.isArray(result) ? result : [];

    return {
      output: {
        templates: templates.map((t: any) => ({
          templateId: t.id,
          name: t.name,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        }))
      },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();
