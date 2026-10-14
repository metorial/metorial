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
      status: z
        .string()
        .optional()
        .describe('Current template status, including Draft or Available'),
      fields: z
        .array(
          z.array(
            z.object({
              apiId: z
                .string()
                .optional()
                .describe('Field identifier for templateFields when creating a document'),
              type: z.string().optional().describe('Field type'),
              page: z.number().optional().describe('Page within the file, starting at 1'),
              placeholderName: z
                .string()
                .optional()
                .describe('Placeholder assigned to the field')
            })
          )
        )
        .optional()
        .describe('Template fields grouped by file'),
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
      name: result.name ?? undefined,
      subject: result.subject ?? undefined,
      message: result.message ?? undefined,
      isDraft:
        result.is_draft ??
        (result.status ? result.status.toLowerCase() === 'draft' : undefined),
      reminders: result.reminders ?? undefined,
      applySigningOrder: result.apply_signing_order ?? undefined,
      allowDecline: result.allow_decline ?? undefined,
      expiresIn: result.expires_in ?? undefined,
      status: result.status ?? undefined,
      fields: result.fields?.map(group =>
        group.map(field => ({
          apiId: field.api_id ?? undefined,
          type: field.type ?? undefined,
          page: field.page ?? undefined,
          placeholderName: field.placeholder_name ?? undefined
        }))
      ),
      placeholders: result.placeholders?.map(p => ({
        placeholderId: p.id ?? undefined,
        name: p.name ?? undefined
      })),
      createdAt: result.created_at ?? undefined,
      updatedAt: result.updated_at ?? undefined
    };

    return {
      output,
      message: `Template **${result.name || result.id}** retrieved with ${result.placeholders?.length ?? 0} placeholder(s).`
    };
  })
  .build();
