import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient, formatValidTags } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description:
    'Creates a reusable document template from a publicly accessible file URL. Returns the template ID and detected merge tags for document generation.',
  instructions: [
    'Supported source files are .docx, .doc, .odt, .rtf, .txt, and .sql. The URL must return the file directly without an interactive login.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      fileUrl: z
        .string()
        .url()
        .describe('Public HTTP or HTTPS URL that directly returns the template file.'),
      filename: z
        .string()
        .min(1)
        .describe('Uploaded filename ending in .docx, .doc, .odt, .rtf, .txt, or .sql.'),
      name: z
        .string()
        .optional()
        .describe('Template name. Defaults to the uploaded filename.'),
      delimiters: z
        .object({ left: z.string().min(1), right: z.string().min(1) })
        .optional()
        .describe('Merge tag delimiters. Automatically detected when omitted.'),
      folder: z
        .array(z.string().min(1))
        .max(100)
        .optional()
        .describe(
          'Folder names from root to leaf. Missing folders are created automatically.'
        ),
      region: z
        .enum(['us', 'eu', 'uk', 'au'])
        .optional()
        .describe(
          'Storage region for this template and its generated documents. Defaults to the account setting.'
        ),
      enhancedSyntax: z
        .boolean()
        .optional()
        .describe(
          'Enable nested properties and logical or mathematical expressions in merge tags.'
        )
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Created template ID, used by generate_document.'),
      name: z.string().describe('Template name.'),
      filename: z.string().describe('Uploaded template filename.'),
      format: z.string().describe('Template file format.'),
      region: z.string().describe('Template storage region.'),
      folder: z.array(z.string()).describe('Folder path from root to leaf.'),
      validTags: z
        .array(z.string())
        .describe(
          'Valid merge tags. Structured list or table tags are represented as JSON strings.'
        ),
      invalidTags: z
        .array(z.string())
        .describe('Invalid merge tags that must be corrected before generating documents.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({ token: ctx.auth.token, region: ctx.config.region });
    let template = await client.createTemplate(ctx.input);
    return {
      output: {
        templateId: template.id,
        name: template.name,
        filename: template.filename,
        format: template.format,
        region: template.region,
        folder: template.folder,
        validTags: formatValidTags(template.tags.valid),
        invalidTags: template.tags.invalid
      },
      message: `Created template **${template.name}** (${template.id}) with ${template.tags.valid.length} valid tag(s) and ${template.tags.invalid.length} invalid tag(s).`
    };
  })
  .build();
