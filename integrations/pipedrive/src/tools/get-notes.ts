import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let noteSchema = z.object({
  noteId: z.number().describe('Note ID'),
  content: z.string().optional().describe('HTML note content'),
  dealId: z.number().optional().nullable().describe('Attached deal ID'),
  personId: z.number().optional().nullable().describe('Attached person ID'),
  organizationId: z.number().optional().nullable().describe('Attached organization ID'),
  leadId: z.string().optional().nullable().describe('Attached lead ID'),
  userId: z.number().optional().describe('Author user ID'),
  activeFlag: z.boolean().optional().describe('Whether the note is active'),
  pinnedToDealFlag: z.boolean().optional().describe('Whether the note is pinned to the deal'),
  pinnedToPersonFlag: z
    .boolean()
    .optional()
    .describe('Whether the note is pinned to the person'),
  pinnedToOrganizationFlag: z
    .boolean()
    .optional()
    .describe('Whether the note is pinned to the organization'),
  pinnedToLeadFlag: z.boolean().optional().describe('Whether the note is pinned to the lead'),
  addTime: z.string().optional().describe('Creation timestamp'),
  updateTime: z.string().optional().nullable().describe('Last update timestamp')
});

let toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return undefined;
};

let mapNote = (note: any) => ({
  noteId: note.id,
  content: note.content,
  dealId: note.deal_id,
  personId: note.person_id,
  organizationId: note.org_id,
  leadId: note.lead_id,
  userId: note.user_id,
  activeFlag: toBoolean(note.active_flag),
  pinnedToDealFlag: toBoolean(note.pinned_to_deal_flag),
  pinnedToPersonFlag: toBoolean(note.pinned_to_person_flag),
  pinnedToOrganizationFlag: toBoolean(note.pinned_to_organization_flag),
  pinnedToLeadFlag: toBoolean(note.pinned_to_lead_flag),
  addTime: note.add_time,
  updateTime: note.update_time
});

export let getNotes = SlateTool.create(spec, {
  name: 'Get Notes',
  key: 'get_notes',
  description: `Retrieve notes from Pipedrive. Fetch a single note by ID or list notes attached to deals, persons, organizations, or leads.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      noteId: z.number().optional().describe('Specific note ID to fetch'),
      userId: z.number().optional().describe('Filter notes by author user ID'),
      dealId: z.number().optional().describe('Filter notes attached to a deal'),
      personId: z.number().optional().describe('Filter notes attached to a person'),
      organizationId: z
        .number()
        .optional()
        .describe('Filter notes attached to an organization'),
      leadId: z.string().optional().describe('Filter notes attached to a lead'),
      startDate: z
        .string()
        .optional()
        .describe('Only include notes from this date (YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('Only include notes until this date (YYYY-MM-DD)'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only include notes updated at or after this RFC3339 timestamp'),
      pinnedToDealFlag: z.boolean().optional().describe('Filter by deal pin state'),
      pinnedToPersonFlag: z.boolean().optional().describe('Filter by person pin state'),
      pinnedToOrganizationFlag: z
        .boolean()
        .optional()
        .describe('Filter by organization pin state'),
      pinnedToLeadFlag: z.boolean().optional().describe('Filter by lead pin state'),
      start: z.number().optional().describe('Pagination start (0-based)'),
      limit: z.number().optional().describe('Number of results to return'),
      sort: z.string().optional().describe('Sort field and direction, e.g. "add_time DESC"')
    })
  )
  .output(
    z.object({
      notes: z.array(noteSchema).describe('List of notes'),
      totalCount: z.number().optional().describe('Total matching count'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.noteId) {
      let result = await client.getNote(ctx.input.noteId);
      let note = result?.data;
      return {
        output: {
          notes: note ? [mapNote(note)] : [],
          totalCount: note ? 1 : 0
        },
        message: note ? `Found note **#${note.id}**.` : 'Note not found.'
      };
    }

    let result = await client.getNotes({
      start: ctx.input.start,
      limit: ctx.input.limit,
      userId: ctx.input.userId,
      dealId: ctx.input.dealId,
      personId: ctx.input.personId,
      orgId: ctx.input.organizationId,
      leadId: ctx.input.leadId,
      sort: ctx.input.sort,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      updatedSince: ctx.input.updatedSince,
      pinnedToDealFlag:
        ctx.input.pinnedToDealFlag === undefined
          ? undefined
          : ctx.input.pinnedToDealFlag
            ? 1
            : 0,
      pinnedToPersonFlag:
        ctx.input.pinnedToPersonFlag === undefined
          ? undefined
          : ctx.input.pinnedToPersonFlag
            ? 1
            : 0,
      pinnedToOrganizationFlag:
        ctx.input.pinnedToOrganizationFlag === undefined
          ? undefined
          : ctx.input.pinnedToOrganizationFlag
            ? 1
            : 0,
      pinnedToLeadFlag:
        ctx.input.pinnedToLeadFlag === undefined
          ? undefined
          : ctx.input.pinnedToLeadFlag
            ? 1
            : 0
    });

    let notes = (result?.data || []).map(mapNote);

    return {
      output: {
        notes,
        totalCount: result?.additional_data?.pagination?.total_count,
        hasMore: result?.additional_data?.pagination?.more_items_in_collection ?? false
      },
      message: `Found **${notes.length}** note(s).`
    };
  });
