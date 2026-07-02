import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let listEmailTemplates = SlateTool.create(spec, {
  name: 'List Email Templates',
  key: 'list_email_templates',
  description: `List all available email templates that can be used when creating broadcasts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Results per page'),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .output(
    z.object({
      emailTemplates: z.array(
        z.object({
          templateId: z.number().describe('Template ID'),
          templateName: z.string().describe('Template name'),
          isDefault: z.boolean().describe('Whether this is the default template')
        })
      ),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let result = await client.listEmailTemplates({
      perPage: ctx.input.perPage,
      after: ctx.input.cursor
    });

    let emailTemplates = result.emailTemplates.map(t => ({
      templateId: t.id,
      templateName: t.name,
      isDefault: t.is_default
    }));

    return {
      output: {
        emailTemplates,
        hasNextPage: result.pagination.has_next_page,
        nextCursor: result.pagination.end_cursor
      },
      message: `Found **${emailTemplates.length}** email template(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
    };
  });
