import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { baseDocumentInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createAsyncDocument = SlateTool.create(spec, {
  name: 'Create Async Document',
  key: 'create_async_document',
  description: `Queues a document for asynchronous background creation with an extended 600-second timeout. Returns a status ID that can be used to poll for completion. Ideal for large or complex documents that may exceed the 60-second synchronous timeout. Optionally accepts a callback URL to receive a POST notification when the document is ready.`,
  instructions: [
    'Either documentContent or documentUrl must be provided, but not both.',
    'Use the "Check Async Document Status" tool to poll for completion using the returned statusId.',
    'If a callbackUrl is provided, DocRaptor will POST the download URL to it upon successful completion.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    baseDocumentInputSchema.extend({
      callbackUrl: z
        .string()
        .optional()
        .describe(
          'URL to receive a POST request when the document is ready. The POST body includes download_url and download_id.'
        )
    })
  )
  .output(
    z.object({
      statusId: z.string().describe('ID to use for polling the document generation status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let testMode = ctx.input.test ?? ctx.config.testMode ?? false;

    let result = await client.createAsyncDocument({
      ...ctx.input,
      test: testMode,
      princeOptions: ctx.input.princeOptions ?? undefined
    });

    return {
      output: {
        statusId: result.statusId
      },
      message: `Async ${ctx.input.documentType.toUpperCase()} document creation queued${ctx.input.name ? ` ("${ctx.input.name}")` : ''}. Status ID: **${result.statusId}**. Use this ID to check the status.`
    };
  })
  .build();
