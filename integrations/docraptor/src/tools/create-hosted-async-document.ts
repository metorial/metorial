import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { hostedDocumentInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createHostedAsyncDocument = SlateTool.create(spec, {
  name: 'Create Hosted Async Document',
  key: 'create_hosted_async_document',
  description:
    'Queues a large or complex document for asynchronous creation and public hosting. Returns a status ID; check_async_status returns the shareable download URL when rendering completes. Hosted documents are a paid add-on.',
  instructions: [
    'Provide either documentContent or documentUrl, but not both.',
    'Call check_async_status with statusId to retrieve the completed document.',
    'Call expire_hosted_document with the returned downloadId to revoke hosted access.',
    'Test hosted documents expire after one day and allow at most five downloads.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    hostedDocumentInputSchema.extend({
      callbackUrl: z
        .string()
        .optional()
        .describe(
          'HTTP or HTTPS URL to receive a POST with download_url and download_id on successful completion.'
        )
    })
  )
  .output(
    z.object({
      statusId: z.string().describe('ID to pass to check_async_status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let testMode = ctx.input.test ?? ctx.config.testMode ?? false;
    let result = await client.createHostedAsyncDocument({
      ...ctx.input,
      test: testMode,
      princeOptions: ctx.input.princeOptions ?? undefined
    });
    return {
      output: result,
      message: `Hosted ${ctx.input.documentType.toUpperCase()} document queued${testMode ? ' (test mode)' : ''}. Use status ID **${result.statusId}** to check completion.`
    };
  })
  .build();
