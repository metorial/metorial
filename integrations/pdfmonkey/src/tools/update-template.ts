import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing document template's HTML body, styles, sample data, or page layout settings. Supports updating both draft and published versions independently. Only provided fields will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      identifier: z.string().optional().describe('New human-readable name for the template'),
      body: z.string().optional().describe('Updated published HTML body'),
      bodyDraft: z.string().optional().describe('Updated draft HTML body'),
      scssStyle: z.string().optional().describe('Updated published SCSS/CSS styles'),
      scssStyleDraft: z.string().optional().describe('Updated draft SCSS/CSS styles'),
      sampleData: z.string().optional().describe('Updated published sample JSON data'),
      sampleDataDraft: z.string().optional().describe('Updated draft sample JSON data'),
      settings: z
        .object({
          paperFormat: z.string().optional().describe('Paper format: A4, Letter, etc.'),
          orientation: z
            .enum(['portrait', 'landscape'])
            .optional()
            .describe('Page orientation'),
          margin: z
            .object({
              top: z.number().optional(),
              bottom: z.number().optional(),
              left: z.number().optional(),
              right: z.number().optional()
            })
            .optional()
            .describe('Page margins in mm')
        })
        .optional()
        .describe('Updated published page layout settings'),
      settingsDraft: z
        .object({
          paperFormat: z.string().optional().describe('Paper format: A4, Letter, etc.'),
          orientation: z
            .enum(['portrait', 'landscape'])
            .optional()
            .describe('Page orientation'),
          margin: z
            .object({
              top: z.number().optional(),
              bottom: z.number().optional(),
              left: z.number().optional(),
              right: z.number().optional()
            })
            .optional()
            .describe('Page margins in mm')
        })
        .optional()
        .describe('Updated draft page layout settings'),
      editionMode: z
        .enum(['code', 'visual'])
        .optional()
        .describe('Edition mode for the template editor'),
      folderId: z
        .string()
        .nullable()
        .optional()
        .describe('Folder ID to move the template to, or null for root'),
      documentTtl: z.number().optional().describe('Auto-deletion TTL in seconds')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the updated template'),
      identifier: z.string().describe('Human-readable name'),
      workspaceId: z.string().describe('Workspace ID'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let settingsObj: Record<string, unknown> | undefined;
    if (ctx.input.settings) {
      settingsObj = {};
      if (ctx.input.settings.paperFormat)
        settingsObj.paper_format = ctx.input.settings.paperFormat;
      if (ctx.input.settings.orientation)
        settingsObj.orientation = ctx.input.settings.orientation;
      if (ctx.input.settings.margin) settingsObj.margin = ctx.input.settings.margin;
    }

    let settingsDraftObj: Record<string, unknown> | undefined;
    if (ctx.input.settingsDraft) {
      settingsDraftObj = {};
      if (ctx.input.settingsDraft.paperFormat)
        settingsDraftObj.paper_format = ctx.input.settingsDraft.paperFormat;
      if (ctx.input.settingsDraft.orientation)
        settingsDraftObj.orientation = ctx.input.settingsDraft.orientation;
      if (ctx.input.settingsDraft.margin)
        settingsDraftObj.margin = ctx.input.settingsDraft.margin;
    }

    let tmpl = await client.updateTemplate(ctx.input.templateId, {
      identifier: ctx.input.identifier,
      body: ctx.input.body,
      bodyDraft: ctx.input.bodyDraft,
      scssStyle: ctx.input.scssStyle,
      scssStyleDraft: ctx.input.scssStyleDraft,
      sampleData: ctx.input.sampleData,
      sampleDataDraft: ctx.input.sampleDataDraft,
      settings: settingsObj,
      settingsDraft: settingsDraftObj,
      editionMode: ctx.input.editionMode,
      templateFolderId: ctx.input.folderId,
      documentTtl: ctx.input.documentTtl
    });

    let output = {
      templateId: String(tmpl.id),
      identifier: String(tmpl.identifier),
      workspaceId: String(tmpl.app_id),
      updatedAt: String(tmpl.updated_at)
    };

    return {
      output,
      message: `Template **${output.identifier}** (${output.templateId}) updated successfully.`
    };
  })
  .build();
