import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing document template's settings such as name, subject, message, reminders, signing order, and expiration. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      name: z.string().optional().describe('Updated template name'),
      subject: z.string().optional().describe('Updated default email subject'),
      message: z.string().optional().describe('Updated default email message'),
      reminders: z.boolean().optional().describe('Enable or disable reminders'),
      applySigningOrder: z.boolean().optional().describe('Enable or disable signing order'),
      allowDecline: z.boolean().optional().describe('Allow or disallow declining'),
      allowReassign: z.boolean().optional().describe('Allow or disallow reassignment'),
      expiresIn: z.number().optional().describe('Updated default expiration in days')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the updated template'),
      name: z.string().optional().describe('Updated name'),
      subject: z.string().optional().describe('Updated subject'),
      message: z.string().optional().describe('Updated message'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    let { templateId, ...updateParams } = ctx.input;
    let result = await client.updateTemplate(templateId, updateParams);

    let output = {
      templateId: result.id,
      name: result.name,
      subject: result.subject,
      message: result.message,
      updatedAt: result.updated_at
    };

    return {
      output,
      message: `Template **${result.name || result.id}** updated successfully.`
    };
  })
  .build();
