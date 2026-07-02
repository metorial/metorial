import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieves all templates in your DocuGenerate account, ordered by creation time (newest first). Returns template metadata including detected merge tags, format, and URIs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z.array(
        z.object({
          templateId: z.string().describe('Unique template ID'),
          created: z.number().describe('Creation timestamp (Unix epoch)'),
          updated: z.number().describe('Last update timestamp (Unix epoch)'),
          name: z.string().describe('Template name'),
          pageCount: z.number().describe('Number of pages in the template'),
          delimiters: z
            .object({
              left: z.string(),
              right: z.string()
            })
            .describe('Tag delimiters used in the template'),
          validTags: z.array(z.string()).describe('Detected valid merge tags'),
          invalidTags: z.array(z.string()).describe('Detected invalid/unclosed merge tags'),
          filename: z.string().describe('Original uploaded filename'),
          format: z.string().describe('Template file format'),
          region: z.string().describe('Processing region'),
          templateUri: z.string().describe('URL to download the template file'),
          previewUri: z.string().describe('URL to preview the template'),
          imageUri: z.string().describe('URL to the template thumbnail image'),
          enhancedSyntax: z.boolean().describe('Whether enhanced syntax is enabled'),
          versioningEnabled: z.boolean().describe('Whether versioning is enabled')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let templates = await client.listTemplates();

    let mapped = templates.map(t => ({
      templateId: t.id,
      created: t.created,
      updated: t.updated,
      name: t.name,
      pageCount: t.page_count,
      delimiters: t.delimiters,
      validTags: t.tags.valid,
      invalidTags: t.tags.invalid,
      filename: t.filename,
      format: t.format,
      region: t.region,
      templateUri: t.template_uri,
      previewUri: t.preview_uri,
      imageUri: t.image_uri,
      enhancedSyntax: t.enhanced_syntax,
      versioningEnabled: t.versioning_enabled
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** template(s). ${mapped.map(t => `**${t.name}** (${t.templateId})`).join(', ')}`
    };
  })
  .build();
