import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { baseDocumentInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createHostedDocument = SlateTool.create(spec, {
  name: 'Create Hosted Document',
  key: 'create_hosted_document',
  description: `Converts HTML content into a document and publishes it at a publicly accessible, unbranded URL. The hosted document can be shared without requiring authentication. Supports configurable download limits and expiration dates. Useful for generating shareable reports, invoices, or other documents.`,
  instructions: [
    'Either documentContent or documentUrl must be provided, but not both.',
    'Hosted documents are a paid add-on; each download is billed at a rate set by your plan.',
    'Use the "Expire Hosted Document" tool to manually remove a hosted document before its expiration.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    baseDocumentInputSchema.extend({
      hostedDownloadLimit: z
        .number()
        .optional()
        .describe('Maximum number of times the hosted document can be downloaded.'),
      hostedExpiresAt: z
        .string()
        .optional()
        .describe(
          'ISO 8601 datetime (UTC) when the hosted document should expire and become inaccessible.'
        )
    })
  )
  .output(
    z.object({
      downloadId: z
        .string()
        .describe(
          'Unique identifier for the hosted document. Used for expiring the document.'
        ),
      downloadUrl: z
        .string()
        .describe('Public URL where the hosted document can be downloaded.'),
      numberOfPages: z
        .number()
        .optional()
        .describe('Number of pages in the generated document.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let testMode = ctx.input.test ?? ctx.config.testMode ?? false;

    let result = await client.createHostedDocument({
      ...ctx.input,
      test: testMode,
      princeOptions: ctx.input.princeOptions ?? undefined
    });

    let message = `Hosted ${ctx.input.documentType.toUpperCase()} document created${ctx.input.name ? ` ("${ctx.input.name}")` : ''}. Download URL: ${result.downloadUrl}`;
    if (ctx.input.hostedDownloadLimit) {
      message += ` (limit: ${ctx.input.hostedDownloadLimit} downloads)`;
    }
    if (ctx.input.hostedExpiresAt) {
      message += ` (expires: ${ctx.input.hostedExpiresAt})`;
    }

    return {
      output: result,
      message
    };
  })
  .build();
