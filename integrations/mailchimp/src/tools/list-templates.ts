import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplatesTool = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve email templates from the Mailchimp account. Filter by type (user-created or Mailchimp gallery). Returns template IDs, names, types, and creation dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of templates to return (default 100)'),
      offset: z.number().optional().describe('Number of templates to skip'),
      type: z.enum(['user', 'base', 'gallery']).optional().describe('Filter by template type')
    })
  )
  .output(
    z.object({
      templates: z.array(
        z.object({
          templateId: z.number(),
          name: z.string(),
          type: z.string(),
          category: z.string().optional(),
          dateCreated: z.string(),
          dateEdited: z.string().optional(),
          active: z.boolean(),
          folderId: z.string().optional(),
          thumbnail: z.string().optional()
        })
      ),
      totalItems: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let result = await client.getTemplates({
      count: ctx.input.count,
      offset: ctx.input.offset,
      type: ctx.input.type
    });

    let templates = (result.templates ?? []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      type: t.type,
      category: t.category,
      dateCreated: t.date_created,
      dateEdited: t.date_edited || undefined,
      active: t.active ?? true,
      folderId: t.folder_id || undefined,
      thumbnail: t.thumbnail || undefined
    }));

    return {
      output: {
        templates,
        totalItems: result.total_items ?? 0
      },
      message: `Found **${templates.length}** template(s) out of ${result.total_items ?? 0} total.`
    };
  })
  .build();
