import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

export let createEditorSession = SlateTool.create(spec, {
  name: 'Create Editor Session',
  key: 'create_editor_session',
  description: `Create a secure, time-limited Bannerbear template editor session. Provides a URL that allows end users to edit a template directly in the browser. Supports default, limited (no add/delete layers), and preview (read-only) modes. Sessions expire after 2 hours.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateUid: z.string().describe('UID of the template to open in the editor'),
      mode: z
        .enum(['default', 'limited', 'preview'])
        .optional()
        .describe(
          'Editor mode: default (full editing), limited (no add/delete layers), or preview (read-only)'
        ),
      metadata: z.string().optional().describe('Custom metadata to attach to the session'),
      customFonts: z
        .array(z.string())
        .optional()
        .describe('List of custom font URLs to make available in the editor')
    })
  )
  .output(
    z.object({
      sessionUid: z.string().describe('UID of the editor session'),
      editorUrl: z.string().describe('URL to access the template editor (expires in 2 hours)'),
      templateUid: z.string().describe('UID of the template being edited'),
      mode: z.string().nullable().describe('Editor mode'),
      createdAt: z.string().describe('Timestamp when the session was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.createSession({
      template: ctx.input.templateUid,
      mode: ctx.input.mode,
      metadata: ctx.input.metadata,
      custom_fonts: ctx.input.customFonts
    });

    return {
      output: {
        sessionUid: result.uid,
        editorUrl: result.session_editor_url,
        templateUid: result.template,
        mode: result.mode || null,
        createdAt: result.created_at
      },
      message: `Editor session created. [Open editor](${result.session_editor_url}) (expires in 2 hours).`
    };
  })
  .build();
