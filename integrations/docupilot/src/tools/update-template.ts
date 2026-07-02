import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update a template's metadata such as title, description, status, folder, or output preferences. Only the fields you provide will be changed.`
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to update'),
      title: z.string().optional().describe('New title for the template'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('New description (set to null to clear)'),
      status: z
        .enum(['active', 'test'])
        .optional()
        .describe('Set to "active" (published) or "test" (draft)'),
      folderId: z
        .number()
        .nullable()
        .optional()
        .describe('Move to this folder ID (null to move to Home)'),
      preferences: z
        .object({
          outputFileName: z
            .string()
            .optional()
            .describe('Custom output file name pattern (supports merge tokens)'),
          password: z
            .string()
            .nullable()
            .optional()
            .describe('PDF password protection (supports merge tokens, null to remove)'),
          format: z
            .enum(['A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid', 'Custom'])
            .optional()
            .describe('Page format'),
          orientation: z
            .enum(['portrait', 'landscape'])
            .optional()
            .describe('Page orientation')
        })
        .optional()
        .describe('Template output preferences to update')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('ID of the updated template'),
      title: z.string().describe('Updated template title'),
      status: z.string().optional().describe('Updated document status'),
      updatedTime: z.string().nullable().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let preferences: Record<string, unknown> | undefined;
    if (ctx.input.preferences) {
      preferences = {};
      if (ctx.input.preferences.outputFileName !== undefined)
        preferences.output_file_name = ctx.input.preferences.outputFileName;
      if (ctx.input.preferences.password !== undefined)
        preferences.password = ctx.input.preferences.password;
      if (ctx.input.preferences.format !== undefined)
        preferences.format = ctx.input.preferences.format;
      if (ctx.input.preferences.orientation !== undefined)
        preferences.orientation = ctx.input.preferences.orientation;
    }

    let template = await client.updateTemplate(ctx.input.templateId, {
      title: ctx.input.title,
      description: ctx.input.description,
      documentStatus: ctx.input.status,
      folder: ctx.input.folderId,
      preferences
    });

    return {
      output: {
        templateId: template.id,
        title: template.title,
        status: template.document_status,
        updatedTime: template.updated_time
      },
      message: `Updated template **"${template.title}"** (ID: ${template.id}).`
    };
  })
  .build();
