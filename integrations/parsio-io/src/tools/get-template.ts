import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve details of a specific parsing template by its ID. Returns the template's configuration and extraction rules.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique identifier of the template'),
      name: z.string().optional().describe('Name of the template'),
      enabled: z.boolean().optional().describe('Whether the template is currently enabled'),
      mailboxId: z.string().optional().describe('ID of the parent mailbox'),
      fields: z.array(z.any()).optional().describe('Extraction fields defined by the template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tpl = await client.getTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: tpl._id || tpl.id,
        name: tpl.name,
        enabled: tpl.enabled,
        mailboxId: tpl.mailbox_id || tpl.mailboxId || tpl.mb,
        fields: tpl.fields
      },
      message: `Retrieved template **${tpl.name || tpl._id || tpl.id}**.`
    };
  })
  .build();
