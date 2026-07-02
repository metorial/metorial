import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a single document (invoice, quote, or contract) by ID, including associated order details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('The unique ID of the document to retrieve')
    })
  )
  .output(
    z.object({
      document: z
        .record(z.string(), z.any())
        .describe('The document record with all attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let response = await client.getDocument(ctx.input.documentId, ['order', 'lines']);
    let document = flattenSingleResource(response);

    return {
      output: { document },
      message: `Retrieved document **${document?.number || ctx.input.documentId}** (${document?.document_type}).`
    };
  })
  .build();
