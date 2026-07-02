import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all templates stored in the Docmosis Cloud environment. Optionally filter by folder and control whether subfolders are included.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folder: z
        .string()
        .optional()
        .describe('Folder path to list templates from (e.g., "/invoices")'),
      includeSubFolders: z
        .boolean()
        .optional()
        .describe('Whether to include templates from subfolders (defaults to true)')
    })
  )
  .output(
    z.object({
      succeeded: z.boolean().describe('Whether the operation succeeded'),
      templates: z
        .array(
          z.object({
            templateName: z.string().describe('Full path and name of the template'),
            sizeBytes: z.number().optional().describe('File size in bytes'),
            uploadedTime: z.number().optional().describe('Upload timestamp in milliseconds')
          })
        )
        .describe('List of templates in the environment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listTemplates(ctx.input.folder, ctx.input.includeSubFolders);

    let templates = (result.templateList || []).map(t => ({
      templateName: t.name,
      sizeBytes: t.sizeBytes,
      uploadedTime: t.uploadedTime
    }));

    let folderInfo = ctx.input.folder ? ` in folder \`${ctx.input.folder}\`` : '';
    let message = result.succeeded
      ? `Found **${templates.length}** template(s)${folderInfo}.`
      : `Failed to list templates: ${result.shortMsg || 'Unknown error'}`;

    return {
      output: {
        succeeded: result.succeeded,
        templates
      },
      message
    };
  })
  .build();
