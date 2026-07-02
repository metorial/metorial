import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNotesTool = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List notes (feedback items) from the Insights board. Supports pagination and filtering by update time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      pageLimit: z.number().optional().describe('Maximum number of notes per page'),
      updatedSince: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to filter notes updated after this time')
    })
  )
  .output(
    z.object({
      notes: z.array(z.record(z.string(), z.any())).describe('List of notes'),
      pageCursor: z.string().optional().describe('Cursor for the next page'),
      totalResults: z.number().optional().describe('Total number of matching notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listNotes({
      pageCursor: ctx.input.pageCursor,
      pageLimit: ctx.input.pageLimit,
      updatedSince: ctx.input.updatedSince
    });

    return {
      output: {
        notes: result.data,
        pageCursor: result.pageCursor,
        totalResults: result.totalResults
      },
      message: `Retrieved ${result.data.length} note(s).${result.pageCursor ? ' More results available.' : ''}`
    };
  })
  .build();
