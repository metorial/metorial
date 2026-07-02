import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Retrieves a paginated list of previously created documents with their metadata, including name, creation date, and test mode status. Results are ordered by creation date (most recent first). Note that DocRaptor does not store the actual generated documents — only metadata is returned.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination. Defaults to 1.'),
      perPage: z.number().optional().describe('Number of documents per page. Defaults to 100.')
    })
  )
  .output(
    z.object({
      documents: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of document metadata records.'),
      count: z.number().describe('Number of documents returned in this page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let documents = await client.listDocuments(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        documents,
        count: documents.length
      },
      message: `Retrieved **${documents.length}** document(s)${ctx.input.page ? ` (page ${ctx.input.page})` : ''}.`
    };
  })
  .build();
