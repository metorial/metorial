import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List files and documents stored in Firmao. Supports pagination and sorting. Returns file metadata including names, sizes, and creation dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum results to return'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      documents: z.array(
        z.object({
          documentId: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          size: z.number().optional(),
          creationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.list('documents', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir
    });

    let documents = result.data.map((d: any) => ({
      documentId: d.id,
      name: d.name,
      description: d.description,
      size: d.size,
      creationDate: d.creationDate
    }));

    return {
      output: { documents, totalSize: result.totalSize },
      message: `Found **${documents.length}** document(s) (total: ${result.totalSize}).`
    };
  })
  .build();
