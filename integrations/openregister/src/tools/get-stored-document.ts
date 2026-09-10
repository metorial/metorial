import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenRegisterClient } from '../lib/client';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getStoredDocument = SlateTool.create(spec, {
  key: 'get_stored_document',
  name: 'Get Stored Document',
  description:
    'Get a downloadable stored registry document and metadata. Discover document_id using get_company or get_company_historical_owners. The download URL expires 15 minutes after the request; call again for a fresh link.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      document_id: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Document ID from get_company documents or get_company_historical_owners ownership_history.'
        )
    })
  )
  .output(out.storedDocumentOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get stored document',
      `/v1/document/${encodeURIComponent(ctx.input.document_id)}`,
      out.storedDocumentOutput,
      {}
    );
    return { output: result, message: 'Get stored document completed.' };
  })
  .build();
