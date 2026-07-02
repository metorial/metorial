import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve the full details of a template including its HTML body, SCSS styles, sample data, page layout settings, and draft/published versions.`,
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
      templateId: z.string().describe('ID of the template'),
      workspaceId: z.string().describe('ID of the workspace'),
      identifier: z.string().describe('Human-readable name of the template'),
      editionMode: z.string().nullable().describe('Edition mode: code or visual'),
      body: z.string().nullable().describe('Published HTML body'),
      bodyDraft: z.string().nullable().describe('Draft HTML body'),
      scssStyle: z.string().nullable().describe('Published SCSS styles'),
      scssStyleDraft: z.string().nullable().describe('Draft SCSS styles'),
      sampleData: z.string().nullable().describe('Published sample data JSON'),
      sampleDataDraft: z.string().nullable().describe('Draft sample data JSON'),
      settings: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Published page layout settings'),
      settingsDraft: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Draft page layout settings'),
      documentTtl: z.number().nullable().describe('Auto-deletion TTL in seconds'),
      folderId: z.string().nullable().describe('Folder ID the template belongs to'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tmpl = await client.getTemplate(ctx.input.templateId);

    let output = {
      templateId: String(tmpl.id),
      workspaceId: String(tmpl.app_id),
      identifier: String(tmpl.identifier),
      editionMode: tmpl.edition_mode ? String(tmpl.edition_mode) : null,
      body: tmpl.body ? String(tmpl.body) : null,
      bodyDraft: tmpl.body_draft ? String(tmpl.body_draft) : null,
      scssStyle: tmpl.scss_style ? String(tmpl.scss_style) : null,
      scssStyleDraft: tmpl.scss_style_draft ? String(tmpl.scss_style_draft) : null,
      sampleData: tmpl.sample_data ? String(tmpl.sample_data) : null,
      sampleDataDraft: tmpl.sample_data_draft ? String(tmpl.sample_data_draft) : null,
      settings: tmpl.settings as Record<string, unknown> | null,
      settingsDraft: tmpl.settings_draft as Record<string, unknown> | null,
      documentTtl: tmpl.document_ttl != null ? Number(tmpl.document_ttl) : null,
      folderId: tmpl.template_folder_id ? String(tmpl.template_folder_id) : null,
      createdAt: String(tmpl.created_at),
      updatedAt: String(tmpl.updated_at)
    };

    return {
      output,
      message: `Template **${output.identifier}** (${output.templateId}) retrieved.`
    };
  })
  .build();
