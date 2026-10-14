import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransactionalTemplates = SlateTool.create(spec, {
  name: 'List Transactional Templates',
  key: 'list_transactional_templates',
  description:
    'Discover transactional email templates and their mail names for send_transactional_email.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter templates by name'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateUuid: z.string().describe('Unique identifier of the template'),
            mailName: z
              .string()
              .describe('Template name to pass as mailName to send_transactional_email'),
            subject: z.string().nullable().describe('Default subject'),
            to: z.string().nullable().describe('Default recipient addresses'),
            cc: z.string().nullable().describe('Default CC addresses'),
            bcc: z.string().nullable().describe('Default BCC addresses'),
            storeMail: z
              .boolean()
              .describe('Whether the email is stored in the transactional log'),
            createdAt: z.string().nullable().describe('Template creation timestamp')
          })
        )
        .describe('Transactional email templates'),
      totalCount: z.number().describe('Total number of matching templates'),
      currentPage: z.number().describe('Current result page'),
      lastPage: z.number().describe('Last available result page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
    let result = await client.listTransactionalTemplates({
      name: ctx.input.name,
      page: ctx.input.page
    });
    let templates = (result.data ?? []).map((template: any) => ({
      templateUuid: template.uuid,
      mailName: template.name,
      subject: template.subject ?? null,
      to: template.to ?? null,
      cc: template.cc ?? null,
      bcc: template.bcc ?? null,
      storeMail: template.store_mail ?? true,
      createdAt: template.created_at ?? null
    }));

    return {
      output: {
        templates,
        totalCount: result.meta?.total ?? templates.length,
        currentPage: result.meta?.current_page ?? ctx.input.page ?? 1,
        lastPage: result.meta?.last_page ?? ctx.input.page ?? 1
      },
      message: `Found **${templates.length}** transactional email template(s).`
    };
  });
