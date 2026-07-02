import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadTemplate = SlateTool.create(spec, {
  name: 'Upload Template',
  key: 'upload_template',
  description: `Upload a document template to Carbone for later use in document generation. The template must be provided as a **base64-encoded** string of a supported file type (DOCX, XLSX, PPTX, ODT, ODS, ODG, ODP, XHTML, IDML, HTML, XML). Optionally enable versioning, assign metadata (name, tags, category, comment), set a deployment timestamp, or configure expiration.`,
  instructions: [
    'The template content must be base64-encoded.',
    'When versioning is enabled, provide a templateId to group versions together.',
    'Templates uploaded with a test API key are deleted after 30 days.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      template: z.string().describe('Base64-encoded content of the template file.'),
      versioning: z
        .boolean()
        .optional()
        .describe(
          'Enable template versioning. When enabled, a unique template ID is created along with a version ID.'
        ),
      templateId: z
        .string()
        .optional()
        .describe(
          'Template ID to associate this upload with (for versioning). Only used when versioning is enabled.'
        ),
      name: z.string().optional().describe('Name for the template.'),
      comment: z.string().optional().describe('Comment or description for the template.'),
      tags: z.array(z.string()).optional().describe('List of tags to assign to the template.'),
      category: z
        .string()
        .optional()
        .describe('Category or folder to group the template under.'),
      deployedAt: z
        .number()
        .optional()
        .describe(
          'UTC Unix timestamp indicating when the template version should be considered deployed.'
        ),
      expireAt: z
        .number()
        .optional()
        .describe('UTC Unix timestamp after which the template will be automatically deleted.')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique template ID.'),
      versionId: z.string().describe('Version ID (SHA256 hash of the file).'),
      type: z.string().describe('File type of the uploaded template (e.g. "docx", "xlsx").'),
      size: z.number().describe('File size in bytes.'),
      createdAt: z.number().describe('UTC Unix timestamp of when the template was created.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      carboneVersion: ctx.config.carboneVersion
    });

    let result = await client.uploadTemplate({
      template: ctx.input.template,
      versioning: ctx.input.versioning,
      templateId: ctx.input.templateId,
      name: ctx.input.name,
      comment: ctx.input.comment,
      tags: ctx.input.tags,
      category: ctx.input.category,
      deployedAt: ctx.input.deployedAt,
      expireAt: ctx.input.expireAt
    });

    return {
      output: result,
      message: `Template uploaded successfully. Template ID: **${result.templateId}**, Version ID: **${result.versionId}**, Type: ${result.type}, Size: ${result.size} bytes.`
    };
  })
  .build();
