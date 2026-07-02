import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { conciseDocSchema } from '../lib/types';
import { spec } from '../spec';

export let listDocs = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_docs',
  description: `Lists and searches documents in Dart. Supports filtering by folder, title, and full-text search across document content.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      folder: z.string().optional().describe('Filter by folder name'),
      title: z.string().optional().describe('Filter by document title'),
      search: z
        .string()
        .optional()
        .describe('Full-text search across title, text, and folder'),
      inTrash: z.boolean().optional().describe('Include trashed documents'),
      ordering: z
        .array(z.string())
        .optional()
        .describe('Ordering fields (e.g., ["-updated_at", "title"])'),
      limit: z.number().optional().describe('Max results per page'),
      offset: z.number().optional().describe('Pagination offset'),
      noDefaults: z.boolean().optional().describe('Disable default filters')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of matching documents'),
      documents: z.array(conciseDocSchema).describe('List of documents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDocs(ctx.input);

    return {
      output: {
        count: result.count,
        documents: result.results
      },
      message: `Found **${result.count}** document(s). Returned ${result.results.length} result(s).`
    };
  })
  .build();
