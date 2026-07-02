import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEditorSession = SlateTool.create(spec, {
  name: 'Create Editor Session',
  key: 'create_editor_session',
  description: `Create a white-label editor session for embedding the CraftMyPDF template editor in an iframe. Returns a unique URL that can be embedded in your application.
Configure permissions to control what the user can do in the embedded editor (save, generate PDF, preview, edit JSON, etc.).`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to open in the editor.'),
      expiration: z
        .number()
        .optional()
        .describe('Session lifetime in minutes. Default is 1440 (24 hours).'),
      canSave: z.boolean().optional().describe('Allow saving changes to the template.'),
      canCreatePDF: z.boolean().optional().describe('Allow generating PDFs from the editor.'),
      canViewSettings: z.boolean().optional().describe('Allow viewing template settings.'),
      canPreview: z.boolean().optional().describe('Allow previewing the template.'),
      canEditJSON: z.boolean().optional().describe('Allow editing JSON data in the editor.'),
      canShowHeader: z.boolean().optional().describe('Show the CraftMyPDF header bar.'),
      canShowLayers: z.boolean().optional().describe('Show the layers panel.'),
      canShowPropertyPanel: z.boolean().optional().describe('Show the property panel.'),
      canShowHelp: z.boolean().optional().describe('Show help options.'),
      canShowData: z.boolean().optional().describe('Show the data panel.'),
      jsonMode: z
        .enum(['editor', 'viewer'])
        .optional()
        .describe('JSON editor mode: "editor" for full editing, "viewer" for read-only.'),
      backUrl: z.string().optional().describe('URL for the back button navigation.')
    })
  )
  .output(
    z.object({
      editorUrl: z.string().describe('URL of the editor session to embed in an iframe.'),
      sessionToken: z
        .string()
        .describe(
          'Unique token for this editor session. Can be used to deactivate the session.'
        ),
      status: z.string().describe('Status of the session creation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Creating editor session...');

    let jsonModeValue: number | undefined;
    if (ctx.input.jsonMode === 'editor') jsonModeValue = 1;
    else if (ctx.input.jsonMode === 'viewer') jsonModeValue = 2;

    let result = await client.createEditorSession({
      templateId: ctx.input.templateId,
      expiration: ctx.input.expiration,
      canSave: ctx.input.canSave,
      canCreatePDF: ctx.input.canCreatePDF,
      canViewSettings: ctx.input.canViewSettings,
      canPreview: ctx.input.canPreview,
      canEditJSON: ctx.input.canEditJSON,
      canShowHeader: ctx.input.canShowHeader,
      canShowLayers: ctx.input.canShowLayers,
      canShowPropertyPanel: ctx.input.canShowPropertyPanel,
      canShowHelp: ctx.input.canShowHelp,
      canShowData: ctx.input.canShowData,
      jsonMode: jsonModeValue,
      backURL: ctx.input.backUrl
    });

    return {
      output: {
        editorUrl: result.url,
        sessionToken: result.token_uuid,
        status: result.status
      },
      message: `Editor session created for template ${ctx.input.templateId}. [Open Editor](${result.url})`
    };
  })
  .build();
