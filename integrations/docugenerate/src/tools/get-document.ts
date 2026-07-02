import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieves metadata for a specific generated document by ID, including the download URI, format, and creation timestamp.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to retrieve')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique document ID'),
      templateId: z.string().describe('ID of the source template'),
      created: z.number().describe('Creation timestamp (Unix epoch)'),
      name: z.string().describe('Document name'),
      dataLength: z.number().describe('Number of data items used'),
      filename: z.string().describe('Generated filename'),
      format: z.string().describe('Output format'),
      documentUri: z.string().describe('URL to download the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let d = await client.getDocument(ctx.input.documentId);

    return {
      output: {
        documentId: d.id,
        templateId: d.template_id,
        created: d.created,
        name: d.name,
        dataLength: d.data_length,
        filename: d.filename,
        format: d.format,
        documentUri: d.document_uri
      },
      message: `Document **${d.name}** (${d.id}) — format: ${d.format}, [download](${d.document_uri})`
    };
  })
  .build();
