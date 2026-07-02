import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { noteSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List notes in OnePageCRM. Filter by contact or company to see all recorded notes. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().optional().describe('Filter notes by contact ID'),
      companyId: z.string().optional().describe('Filter notes by company ID'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      notes: z.array(noteSchema).describe('List of notes'),
      totalCount: z.number().describe('Total number of matching notes'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.listNotes(ctx.input);

    return {
      output: result,
      message: `Found **${result.totalCount}** notes (page ${result.page}, showing ${result.notes.length}).`
    };
  })
  .build();
