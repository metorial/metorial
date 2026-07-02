import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Retrieves all documents generated from a specific template. Returns document metadata including download URIs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to list documents for')
    })
  )
  .output(
    z.object({
      documents: z.array(
        z.object({
          documentId: z.string().describe('Unique document ID'),
          templateId: z.string().describe('ID of the source template'),
          created: z.number().describe('Creation timestamp (Unix epoch)'),
          name: z.string().describe('Document name'),
          dataLength: z
            .number()
            .describe('Number of data items used to generate the document'),
          filename: z.string().describe('Generated filename'),
          format: z.string().describe('Output format'),
          documentUri: z.string().describe('URL to download the document')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let docs = await client.listDocuments(ctx.input.templateId);

    let documents = docs.map(d => ({
      documentId: d.id,
      templateId: d.template_id,
      created: d.created,
      name: d.name,
      dataLength: d.data_length,
      filename: d.filename,
      format: d.format,
      documentUri: d.document_uri
    }));

    return {
      output: { documents },
      message: `Found **${documents.length}** document(s) for template ${ctx.input.templateId}`
    };
  })
  .build();
