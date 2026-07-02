import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserAccess = SlateTool.create(spec, {
  name: 'Get User Access',
  key: 'get_user_access',
  description: `Retrieve editor and embedded editor URLs for a user via the Adrapid Administrative API. These URLs allow logging a user into the Adrapid system and embedding the editor into a third-party application. This is an **enterprise/whitelabel** feature.

Optionally specify a template ID to open the editor directly to that template, or omit it to show the template selector.`,
  instructions: [
    'This endpoint is part of the enterprise Administrative API and requires appropriate access.',
    'The returned embeddedEditorURL can be used as the src attribute of an iframe to embed the editor.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to generate access URLs for'),
      templateId: z
        .string()
        .optional()
        .describe(
          'Optional template ID to open the editor directly to a specific template. Omit to show the template selector.'
        ),
      editorOptions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional editor customization options passed as query parameters')
    })
  )
  .output(
    z.object({
      editorURL: z.string().describe('URL to log the user into the Adrapid editor'),
      embeddedEditorURL: z
        .string()
        .describe('URL to embed the Adrapid editor as an iframe in a host application')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let access = await client.getUserAccess(ctx.input.userId, {
      templateId: ctx.input.templateId,
      editorOptions: ctx.input.editorOptions
    });

    return {
      output: {
        editorURL: access.editorURL,
        embeddedEditorURL: access.embeddedEditorURL
      },
      message: `Access URLs generated for user **${ctx.input.userId}**.`
    };
  })
  .build();
