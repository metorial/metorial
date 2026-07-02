import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadSessionFile = SlateTool.create(spec, {
  name: 'Upload Session File',
  key: 'upload_session_file',
  description: `Upload a file into a running Browserbase session so browser automation can attach it to forms or otherwise use it inside the remote browser.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID to upload the file into'),
      fileName: z.string().describe('Filename to expose in the session'),
      fileContentBase64: z.string().describe('Base64-encoded file bytes'),
      mimeType: z
        .string()
        .optional()
        .describe('File MIME type. Defaults to application/octet-stream.')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session identifier'),
      fileName: z.string().describe('Uploaded filename'),
      uploaded: z.boolean().describe('Whether Browserbase accepted the upload'),
      message: z.string().describe('Browserbase upload response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.uploadSessionFile(ctx.input.sessionId, {
      fileName: ctx.input.fileName,
      contentBase64: ctx.input.fileContentBase64,
      mimeType: ctx.input.mimeType
    });

    return {
      output: {
        sessionId: ctx.input.sessionId,
        fileName: ctx.input.fileName,
        uploaded: true,
        message: result.message
      },
      message: `Uploaded **${ctx.input.fileName}** to session **${ctx.input.sessionId}**.`
    };
  })
  .build();
