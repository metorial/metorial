import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { browserlessServiceError } from '../lib/errors';
import { spec } from '../spec';
import { fileAttachment, fileOutput, fileOutputSchema } from './shared';

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description: `Run custom Puppeteer code and return the file that Chrome downloads during execution. Use this for sites where the target file is produced after clicks, form interactions, or client-side Blob creation.`,
  instructions: [
    'Export a default async function, e.g. `export default async ({ page, context }) => { ... }`.',
    'Your code should trigger a browser download and wait until it is available.',
    'The downloaded bytes are returned through Slate attachments, not inline output fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      code: z
        .string()
        .describe(
          'JavaScript code that navigates, interacts with the page, and triggers a download'
        ),
      context: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value context data passed to the download function')
    })
  )
  .output(fileOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.code.trim()) {
      throw browserlessServiceError('code cannot be empty.');
    }

    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let file = await client.download({
      code: ctx.input.code,
      context: ctx.input.context
    });

    return {
      output: fileOutput(file),
      attachments: [fileAttachment(file)],
      message: `Downloaded file from browser automation (${file.byteLength} bytes).`
    };
  })
  .build();
