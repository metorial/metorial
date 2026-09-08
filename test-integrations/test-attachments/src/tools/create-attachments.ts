import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { AUTHENTICATED_FILE_REFERENCE, createAuthenticatedFileUrl } from './get-file-url';

let LARGE_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export let createAttachments = SlateTool.create(spec, {
  name: 'Create Attachments',
  key: 'create_attachments',
  description:
    'Create streamed content attachments and a refreshable URL attachment for exercising upload and download handling.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      attachmentCount: z.number().describe('Number of attachments returned by the tool.'),
      currentDate: z
        .string()
        .describe('ISO timestamp used to generate the current-date attachment.')
    })
  )
  .handleInvocation(async ctx => {
    let currentDate = new Date().toISOString();
    let authenticatedFile = createAuthenticatedFileUrl(
      ctx.config.attachmentServerUrl,
      ctx.auth.token
    );

    await ctx.addAttachment({
      type: 'content',
      content: new Response('hello world', {
        headers: { 'content-type': 'text/plain' }
      }),
      filename: 'hello-world.txt'
    });

    await ctx.addAttachment({
      type: 'content',
      content: new Response(currentDate, {
        headers: { 'content-type': 'text/plain' }
      }),
      filename: 'current-date.txt'
    });

    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(LARGE_ATTACHMENT_SIZE_BYTES).fill(65), {
        headers: { 'content-type': 'application/octet-stream' }
      }),
      filename: 'large-upload.bin'
    });

    await ctx.addAttachment({
      type: 'url',
      url: authenticatedFile.url,
      mimeType: 'application/octet-stream',
      headers: authenticatedFile.headers,
      query: authenticatedFile.query,
      refreshReference: AUTHENTICATED_FILE_REFERENCE,
      refreshAt: authenticatedFile.expiresAt
    });

    return {
      output: {
        attachmentCount: 4,
        currentDate
      },
      message: `Created **4** attachments through the new attachment paths: two small streamed files, one 10 MiB streamed upload, and one refreshable authenticated URL. The current-date attachment was generated at **${currentDate}**.`
    };
  })
  .build();
