import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List one page of parsing templates for a mailbox. Templates define the extraction rules used to parse documents in the mailbox.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to list templates for'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the template'),
            name: z.string().optional().describe('Name of the template'),
            enabled: z
              .boolean()
              .optional()
              .describe('Whether the template is currently enabled')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let templates = await client.listTemplates(ctx.input.mailboxId, ctx.input.page);

    let mapped = (Array.isArray(templates) ? templates : []).map((tpl: any) => ({
      templateId: tpl._id || tpl.id,
      name: tpl.name ?? undefined,
      enabled: tpl.enabled ?? undefined
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** template(s) in mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
