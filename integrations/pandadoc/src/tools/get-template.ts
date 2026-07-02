import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve full details of a PandaDoc template including its roles, fields, tokens, pricing tables, content placeholders, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('UUID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template UUID'),
      templateName: z.string().describe('Template name'),
      dateCreated: z.string().optional().describe('ISO 8601 creation date'),
      dateModified: z.string().optional().describe('ISO 8601 last modified date'),
      contentDateModified: z
        .string()
        .optional()
        .describe('ISO 8601 date when content was last modified'),
      version: z.string().optional().describe('Template version'),
      roles: z.array(z.any()).optional().describe('Template roles'),
      fields: z.array(z.any()).optional().describe('Template fields'),
      tokens: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Template tokens'),
      metadata: z.record(z.string(), z.any()).optional().describe('Template metadata'),
      tags: z.array(z.string()).optional().describe('Template tags'),
      contentPlaceholders: z.array(z.any()).optional().describe('Content placeholders'),
      pricing: z
        .any()
        .optional()
        .describe('Pricing data including tables, quotes, and merge rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let template = await client.getTemplateDetails(ctx.input.templateId);

    let tokens = (template.tokens || []).map((t: any) => ({
      name: t.name,
      value: t.value
    }));

    return {
      output: {
        templateId: template.id,
        templateName: template.name,
        dateCreated: template.date_created,
        dateModified: template.date_modified,
        contentDateModified: template.content_date_modified,
        version: template.version,
        roles: template.roles,
        fields: template.fields,
        tokens,
        metadata: template.metadata,
        tags: template.tags,
        contentPlaceholders: template.content_placeholders,
        pricing: template.pricing
      },
      message: `Retrieved template **${template.name}** (ID: \`${template.id}\`) with ${(template.roles || []).length} role(s) and ${(template.fields || []).length} field(s).`
    };
  })
  .build();
