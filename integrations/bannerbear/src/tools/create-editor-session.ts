import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { address, nonempty, nullableText, uid } from '../lib/contracts';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createEditorSession = SlateTool.create(spec, {
  name: 'Create Editor Session',
  key: 'create_editor_session',
  description: `Create a secure, time-limited Bannerbear template editor session. Provides a URL that allows end users to edit a template directly in the browser. Supports default, limited (no add/delete layers), and preview (read-only) modes. Sessions last two hours after first access and are bound to the accessing browser.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
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
        .describe('List of installed custom font names to make available in the editor')
    })
  )
  .output(
    z.object({
      sessionUid: z.string().describe('UID of the editor session'),
      editorUrl: z
        .string()
        .describe('URL to access the template editor (two-hour session after first access)'),
      templateUid: z.string().describe('UID of the template being edited'),
      mode: z.string().nullable().describe('Editor mode'),
      createdAt: z.string().describe('Timestamp when the session was created')
    })
  )
  .handleInvocation(async ctx => {
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const result = await client.createSession({
      template: ctx.input.templateUid,
      mode: ctx.input.mode,
      metadata: ctx.input.metadata,
      custom_fonts: ctx.input.customFonts
    });
    const output = {
      sessionUid: uid(result.uid),
      editorUrl: address(result.session_editor_url, true),
      templateUid: uid(result.template),
      mode: nullableText(result.mode),
      createdAt: nonempty(result.created_at)
    };
    return {
      output,
      message: `Editor session created. [Open editor](${output.editorUrl}). The session lasts two hours after first access and is bound to that browser.`
    };
  })
  .build();
