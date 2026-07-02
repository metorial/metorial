import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all parsing templates for a mailbox. Templates define the extraction rules used to parse documents in the mailbox.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to list templates for')
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
    let templates = await client.listTemplates(ctx.input.mailboxId);

    let mapped = (Array.isArray(templates) ? templates : []).map((tpl: any) => ({
      templateId: tpl._id || tpl.id,
      name: tpl.name,
      enabled: tpl.enabled
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** template(s) in mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
