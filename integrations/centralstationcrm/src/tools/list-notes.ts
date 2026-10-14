import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description:
    'List CentralStationCRM communication history, including notes and email entries. Optionally filter by a person, company, deal, or project.',
  constraints: ['Maximum 250 results per page.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      personId: z.number().int().positive().optional().describe('Filter by person ID'),
      companyId: z.number().int().positive().optional().describe('Filter by company ID'),
      dealId: z.number().int().positive().optional().describe('Filter by deal ID'),
      projectId: z.number().int().positive().optional().describe('Filter by project ID'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1'),
      perPage: z.number().int().min(1).max(250).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      notes: z.array(
        z.object({
          noteId: z.number().describe('Communication entry ID'),
          title: z.string().optional().describe('Entry title'),
          content: z.string().optional().describe('Entry content'),
          type: z.string().optional().describe('Entry type returned by the provider'),
          personIds: z.array(z.number()).optional().describe('Related person IDs'),
          companyIds: z.array(z.number()).optional().describe('Related company IDs'),
          dealIds: z.array(z.number()).optional().describe('Related deal IDs'),
          projectIds: z.array(z.number()).optional().describe('Related project IDs'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      count: z.number().describe('Number of entries on this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountName: ctx.config.accountName });
    let result = await client.listNotes({
      person_id: ctx.input.personId,
      company_id: ctx.input.companyId,
      deal_id: ctx.input.dealId,
      project_id: ctx.input.projectId,
      page: ctx.input.page,
      perpage: ctx.input.perPage
    });
    let notes = (Array.isArray(result) ? result : []).map(item => {
      let note =
        item?.protocol_object_note ??
        item?.protocol_email ??
        item?.protocol_external ??
        item?.protocol_user_note ??
        item?.protocol_attachment ??
        item?.protocol ??
        item;
      return {
        noteId: note.id,
        title: note.name ?? undefined,
        content: note.content ?? undefined,
        type: note.type ?? undefined,
        personIds: note.person_ids ?? undefined,
        companyIds: note.company_ids ?? undefined,
        dealIds: note.deal_ids ?? undefined,
        projectIds: note.project_ids ?? undefined,
        createdAt: note.created_at ?? undefined,
        updatedAt: note.updated_at ?? undefined
      };
    });
    return {
      output: { notes, count: notes.length },
      message: `Found **${notes.length}** communication entries.`
    };
  })
  .build();
