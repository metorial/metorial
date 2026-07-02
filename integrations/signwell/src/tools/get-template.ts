import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a document template and its configuration including placeholders, fields, and settings. Use this to inspect a template before creating documents from it.`,
  tags: {
    destructive: false,
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
      templateId: z.string().describe('Unique ID of the template'),
      name: z.string().optional().describe('Name of the template'),
      subject: z.string().optional().describe('Default email subject'),
      message: z.string().optional().describe('Default email message'),
      isDraft: z.boolean().optional().describe('Whether the template is a draft'),
      reminders: z.boolean().optional().describe('Whether reminders are enabled'),
      applySigningOrder: z.boolean().optional().describe('Whether signing order is enforced'),
      allowDecline: z.boolean().optional().describe('Whether decline is allowed'),
      expiresIn: z.number().optional().describe('Default expiration in days'),
      placeholders: z
        .array(
          z.object({
            placeholderId: z.string().optional().describe('Placeholder ID'),
            name: z.string().optional().describe('Placeholder name')
          })
        )
        .optional()
        .describe('Template placeholders for recipients'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    let result = await client.getTemplate(ctx.input.templateId);

    let output = {
      templateId: result.id,
      name: result.name,
      subject: result.subject,
      message: result.message,
      isDraft: result.is_draft,
      reminders: result.reminders,
      applySigningOrder: result.apply_signing_order,
      allowDecline: result.allow_decline,
      expiresIn: result.expires_in,
      placeholders: result.placeholders?.map((p: any) => ({
        placeholderId: p.id,
        name: p.name
      })),
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    return {
      output,
      message: `Template **${result.name || result.id}** retrieved with ${result.placeholders?.length ?? 0} placeholder(s).`
    };
  })
  .build();
