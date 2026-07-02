import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List notes in Pipeline CRM. Can list all notes or filter by association (deal, person, or company). Returns paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 200, max: 200)'),
      dealId: z.number().optional().describe('Filter notes by deal ID'),
      personId: z.number().optional().describe('Filter notes by person ID'),
      companyId: z.number().optional().describe('Filter notes by company ID')
    })
  )
  .output(
    z.object({
      notes: z
        .array(
          z.object({
            noteId: z.number().describe('Unique note ID'),
            content: z.string().nullable().optional().describe('Note text content'),
            dealId: z.number().nullable().optional().describe('Associated deal ID'),
            personId: z.number().nullable().optional().describe('Associated person ID'),
            companyId: z.number().nullable().optional().describe('Associated company ID'),
            userId: z.number().nullable().optional().describe('Note author user ID'),
            createdAt: z.string().nullable().optional().describe('Creation timestamp'),
            updatedAt: z.string().nullable().optional().describe('Last update timestamp')
          })
        )
        .describe('List of notes'),
      totalCount: z.number().describe('Total number of matching notes'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let result = await client.listNotes({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      dealId: ctx.input.dealId,
      personId: ctx.input.personId,
      companyId: ctx.input.companyId
    });

    let notes = (result.entries ?? []).map((note: any) => ({
      noteId: note.id,
      content: note.content ?? null,
      dealId: note.deal_id ?? null,
      personId: note.person_id ?? null,
      companyId: note.company_id ?? null,
      userId: note.user_id ?? null,
      createdAt: note.created_at ?? null,
      updatedAt: note.updated_at ?? null
    }));

    return {
      output: {
        notes,
        totalCount: result.pagination?.total ?? notes.length,
        currentPage: result.pagination?.page ?? 1,
        totalPages: result.pagination?.pages ?? 1
      },
      message: `Found **${result.pagination?.total ?? notes.length}** notes (page ${result.pagination?.page ?? 1} of ${result.pagination?.pages ?? 1})`
    };
  })
  .build();
