import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Updates a template's name, merge tag delimiters, folder, region, or settings, and can replace its source file. Provide only the fields you want to change.`,
  instructions: [
    'Provide at least one field to update. Replacing the template file requires both fileUrl and filename.',
    'Template version history depends on your account plan.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      name: z.string().optional().describe('New name for the template'),
      fileUrl: z
        .string()
        .url()
        .optional()
        .describe(
          'Public HTTP or HTTPS URL of the replacement template file. Requires filename.'
        ),
      filename: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Replacement filename ending in .docx, .doc, .odt, .rtf, .txt, or .sql. Requires fileUrl.'
        ),
      delimiters: z
        .object({ left: z.string().min(1), right: z.string().min(1) })
        .optional()
        .describe('New tag delimiters. The template is processed again to detect its tags.'),
      folder: z
        .array(z.string().min(1))
        .max(100)
        .optional()
        .describe(
          'Folder names from root to leaf. An empty array moves the template out of any folder.'
        ),
      region: z
        .enum(['us', 'eu', 'uk', 'au'])
        .optional()
        .describe(
          'Move the template and future document generation to this storage region. Existing documents stay in their current region.'
        ),
      enhancedSyntax: z
        .boolean()
        .optional()
        .describe('Enable or disable enhanced syntax for this template'),
      versioningEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable versioning for this template')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Updated template ID'),
      name: z.string().describe('Updated template name'),
      folder: z
        .array(z.string())
        .optional()
        .describe('Updated folder names from root to leaf.'),
      region: z.string().optional().describe('Updated template storage region.'),
      enhancedSyntax: z.boolean().describe('Whether enhanced syntax is enabled'),
      versioningEnabled: z.boolean().describe('Whether versioning is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let t = await client.updateTemplate(ctx.input.templateId, {
      name: ctx.input.name,
      fileUrl: ctx.input.fileUrl,
      filename: ctx.input.filename,
      delimiters: ctx.input.delimiters,
      folder: ctx.input.folder,
      region: ctx.input.region,
      enhancedSyntax: ctx.input.enhancedSyntax,
      versioningEnabled: ctx.input.versioningEnabled
    });

    return {
      output: {
        templateId: t.id,
        name: t.name,
        folder: t.folder,
        region: t.region,
        enhancedSyntax: t.enhanced_syntax,
        versioningEnabled: t.versioning_enabled
      },
      message: `Updated template **${t.name}** (${t.id})`
    };
  })
  .build();
