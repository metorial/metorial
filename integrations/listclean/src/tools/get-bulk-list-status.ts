import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { spec } from '../spec';

export let getBulkListStatus = SlateTool.create(spec, {
  name: 'Get Bulk List Status',
  key: 'get_bulk_list_status',
  description: `Check the processing status of a previously uploaded bulk email list. Returns the current status, total email count, and breakdown of clean/dirty/unknown results once processing is complete.`,
  instructions: [
    'Use the listId returned from the Upload Bulk List tool.',
    'Status will be "COMPLETED" when the list is fully processed and results are available for download.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('The unique identifier of the bulk list to check')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Unique identifier of the bulk list'),
      fileName: z.string().describe('Original file name'),
      status: z.string().describe('Current processing status (e.g., PROCESSING, COMPLETED)'),
      totalEmails: z.number().describe('Total number of email addresses in the list'),
      cleanCount: z.number().describe('Number of clean (valid) email addresses'),
      dirtyCount: z.number().describe('Number of dirty (invalid) email addresses'),
      unknownCount: z.number().describe('Number of unknown (unverifiable) email addresses'),
      createdAt: z.string().describe('Timestamp when the list was uploaded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({
      token: ctx.auth.token
    });

    ctx.progress('Fetching bulk list status...');
    let list = await client.getBulkListStatus(ctx.input.listId);

    return {
      output: {
        listId: String(list.listId || ctx.input.listId),
        fileName: list.fileName || '',
        status: list.status || '',
        totalEmails: list.totalEmails ?? 0,
        cleanCount: list.cleanCount ?? 0,
        dirtyCount: list.dirtyCount ?? 0,
        unknownCount: list.unknownCount ?? 0,
        createdAt: list.createdAt || ''
      },
      message: `Bulk list **${list.fileName || ctx.input.listId}** — Status: **${list.status}**. Total: ${list.totalEmails ?? 0}, Clean: ${list.cleanCount ?? 0}, Dirty: ${list.dirtyCount ?? 0}, Unknown: ${list.unknownCount ?? 0}.`
    };
  })
  .build();
