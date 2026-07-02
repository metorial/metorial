import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocumentTypes = SlateTool.create(spec, {
  name: 'List Document Types',
  key: 'list_document_types',
  description: `List available document types configured in your Elorus organization. Document types include invoices, credit notes, bills, estimates, etc. Use the returned IDs when creating invoices, estimates, or bills.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by document type title.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of document types.'),
      documentTypes: z.array(z.any()).describe('Array of document type objects.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listDocumentTypes({
      search: ctx.input.search,
      searchFields: ctx.input.search ? 'title' : undefined,
      pageSize: 250
    });

    return {
      output: {
        totalCount: result.count,
        documentTypes: result.results
      },
      message: `Found **${result.count}** document type(s).`
    };
  })
  .build();
