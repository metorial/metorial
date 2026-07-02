import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a specific document and its extracted data from Affinda. Returns document metadata, processing state, and the structured data extracted by the AI model. Use this to check parsing status or fetch results for a document uploaded with \`wait: false\`.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentIdentifier: z
        .string()
        .describe('Unique identifier of the document to retrieve.'),
      format: z
        .enum(['json', 'xml'])
        .optional()
        .describe('Response format for the extracted data.'),
      compact: z
        .boolean()
        .optional()
        .describe('If true, returns a compact version of the parsed result.')
    })
  )
  .output(
    z.object({
      documentIdentifier: z.string().describe('Unique identifier of the document.'),
      fileName: z.string().optional().describe('Name of the processed file.'),
      state: z.string().optional().describe('Current processing state of the document.'),
      ready: z.boolean().optional().describe('Whether the document has finished processing.'),
      failed: z.boolean().optional().describe('Whether parsing has failed.'),
      workspaceIdentifier: z
        .string()
        .optional()
        .describe('Workspace the document belongs to.'),
      collectionIdentifier: z
        .string()
        .optional()
        .describe('Collection the document belongs to.'),
      extractedData: z
        .any()
        .optional()
        .describe('Structured JSON data extracted from the document.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getDocument(ctx.input.documentIdentifier, {
      format: ctx.input.format,
      compact: ctx.input.compact
    });

    let meta = result.meta ?? result;

    return {
      output: {
        documentIdentifier: meta.identifier ?? ctx.input.documentIdentifier,
        fileName: meta.fileName,
        state: meta.state,
        ready: meta.ready,
        failed: meta.failed,
        workspaceIdentifier: meta.workspace?.identifier,
        collectionIdentifier: meta.collection?.identifier,
        extractedData: result.data
      },
      message: `Retrieved document **${meta.fileName ?? ctx.input.documentIdentifier}** (state: ${meta.state ?? 'unknown'}).`
    };
  })
  .build();
