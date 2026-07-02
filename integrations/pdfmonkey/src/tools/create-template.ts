import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new document template with an HTML body, SCSS styles, sample data, and page layout settings. Templates define the structure and appearance of generated documents.`,
  instructions: [
    'At minimum, provide a workspaceId and identifier (name) for the template.',
    'The HTML body supports Liquid templating syntax for dynamic data.',
    'Use settingsDraft for preview settings and settings for published document settings.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to create the template in'),
      identifier: z.string().describe('Human-readable name for the template'),
      body: z.string().optional().describe('Published HTML body (supports Liquid templating)'),
      bodyDraft: z.string().optional().describe('Draft HTML body for preview'),
      scssStyle: z.string().optional().describe('Published SCSS/CSS styles'),
      scssStyleDraft: z.string().optional().describe('Draft SCSS/CSS styles'),
      sampleData: z
        .string()
        .optional()
        .describe('Sample JSON data for testing the published template'),
      sampleDataDraft: z
        .string()
        .optional()
        .describe('Sample JSON data for testing the draft template'),
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
        .describe('Published page layout settings'),
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
        .describe('Draft page layout settings'),
      editionMode: z
        .enum(['code', 'builder'])
        .optional()
        .describe('Edition mode for the template editor'),
      outputType: z
        .enum(['pdf', 'image'])
        .optional()
        .describe('Template output type. Defaults to pdf. Use image for image templates.'),
      pdfEngineId: z
        .string()
        .optional()
        .describe(
          'PDF engine ID used for generated documents. Omit to use the latest engine.'
        ),
      pdfEngineDraftId: z
        .string()
        .optional()
        .describe('PDF engine ID used for draft previews. Omit to use the latest engine.'),
      folderId: z.string().optional().describe('Folder ID to organize the template into'),
      documentTtl: z
        .number()
        .optional()
        .describe('Auto-deletion TTL in seconds (e.g. 300, 1200, 3600, 86400, 604800)')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the created template'),
      identifier: z.string().describe('Human-readable name'),
      workspaceId: z.string().describe('Workspace ID'),
      outputType: z.string().nullable().describe('Template output type'),
      pdfEngineId: z.string().nullable().describe('PDF engine ID used for generation'),
      pdfEngineDraftId: z.string().nullable().describe('PDF engine ID used for previews'),
      createdAt: z.string().describe('Creation timestamp'),
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

    let tmpl = await client.createTemplate({
      workspaceId: ctx.input.workspaceId,
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
      outputType: ctx.input.outputType,
      pdfEngineId: ctx.input.pdfEngineId,
      pdfEngineDraftId: ctx.input.pdfEngineDraftId,
      templateFolderId: ctx.input.folderId,
      documentTtl: ctx.input.documentTtl
    });

    let output = {
      templateId: String(tmpl.id),
      identifier: String(tmpl.identifier),
      workspaceId: String(tmpl.app_id),
      outputType: tmpl.output_type ? String(tmpl.output_type) : null,
      pdfEngineId: tmpl.pdf_engine_id ? String(tmpl.pdf_engine_id) : null,
      pdfEngineDraftId: tmpl.pdf_engine_draft_id ? String(tmpl.pdf_engine_draft_id) : null,
      createdAt: String(tmpl.created_at),
      updatedAt: String(tmpl.updated_at)
    };

    return {
      output,
      message: `Template **${output.identifier}** (${output.templateId}) created successfully.`
    };
  })
  .build();
