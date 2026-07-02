import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { spec } from '../spec';

export let listBulkLists = SlateTool.create(spec, {
  name: 'List Bulk Lists',
  key: 'list_bulk_lists',
  description: `Retrieve all bulk email verification lists associated with your account. Returns each list's ID, file name, status, and email counts.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.string().describe('Unique identifier of the bulk list'),
            fileName: z.string().describe('Original file name'),
            status: z.string().describe('Processing status'),
            totalEmails: z.number().describe('Total email addresses in the list'),
            cleanCount: z.number().describe('Number of clean (valid) emails'),
            dirtyCount: z.number().describe('Number of dirty (invalid) emails'),
            unknownCount: z.number().describe('Number of unknown emails'),
            createdAt: z.string().describe('Upload timestamp')
          })
        )
        .describe('All bulk verification lists on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({
      token: ctx.auth.token
    });

    ctx.progress('Fetching bulk lists...');
    let rawLists = await client.getBulkLists();

    let lists = rawLists.map(l => ({
      listId: String(l.listId || ''),
      fileName: l.fileName || '',
      status: l.status || '',
      totalEmails: l.totalEmails ?? 0,
      cleanCount: l.cleanCount ?? 0,
      dirtyCount: l.dirtyCount ?? 0,
      unknownCount: l.unknownCount ?? 0,
      createdAt: l.createdAt || ''
    }));

    return {
      output: { lists },
      message: `Found **${lists.length}** bulk list(s).`
    };
  })
  .build();
