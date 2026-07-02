import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';
import {
  fileAttachment,
  fileOutput,
  fileOutputSchema,
  gotoOptionsSchema,
  requireHttpUrl,
  waitForSelectorSchema
} from './shared';

export let exportUrl = SlateTool.create(spec, {
  name: 'Export URL',
  key: 'export_url',
  description: `Fetch a URL through Browserless and return its native content type as a Slate attachment. Use this to download unknown file types, PDFs, images, rendered HTML, or a ZIP containing a page and its linked resources.`,
  instructions: [
    'Use includeResources to package rendered HTML plus linked assets into a ZIP file.',
    'The exported bytes are returned through Slate attachments, not inline output fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('HTTP or HTTPS URL to export'),
      includeResources: z
        .boolean()
        .optional()
        .describe('Return a ZIP with HTML and linked resources for offline use'),
      gotoOptions: gotoOptionsSchema,
      waitForSelector: waitForSelectorSchema,
      waitForTimeout: z.number().optional().describe('Wait a fixed number of milliseconds'),
      bestAttempt: z.boolean().optional().describe('Proceed even when async events fail'),
      rejectResourceTypes: z.array(z.string()).optional().describe('Resource types to block'),
      rejectRequestPattern: z
        .array(z.string())
        .optional()
        .describe('Request URL patterns to block'),
      userAgent: z.string().optional().describe('Custom User-Agent string'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional request headers')
    })
  )
  .output(fileOutputSchema)
  .handleInvocation(async ctx => {
    requireHttpUrl(ctx.input.url);

    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let file = await client.exportUrl({
      url: ctx.input.url,
      includeResources: ctx.input.includeResources,
      gotoOptions: ctx.input.gotoOptions,
      waitForSelector: ctx.input.waitForSelector,
      waitForTimeout: ctx.input.waitForTimeout,
      bestAttempt: ctx.input.bestAttempt,
      rejectResourceTypes: ctx.input.rejectResourceTypes,
      rejectRequestPattern: ctx.input.rejectRequestPattern,
      userAgent: ctx.input.userAgent,
      headers: ctx.input.headers
    });

    return {
      output: fileOutput(file),
      attachments: [fileAttachment(file)],
      message: `Exported ${ctx.input.url} as ${file.mimeType} (${file.byteLength} bytes).`
    };
  })
  .build();
