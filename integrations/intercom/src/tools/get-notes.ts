import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let getNotes = SlateTool.create(spec, {
  name: 'Get Notes',
  key: 'get_notes',
  description: `Retrieve an Intercom note by ID or list notes attached to a contact or company. Notes capture internal teammate context for customer records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      noteId: z.string().optional().describe('Note ID to retrieve'),
      contactId: z.string().optional().describe('Contact ID whose notes should be listed'),
      companyId: z.string().optional().describe('Company ID whose notes should be listed')
    })
  )
  .output(
    z.object({
      note: z
        .object({
          noteId: z.string().describe('Note ID'),
          body: z.string().optional().describe('Note body'),
          authorId: z.string().optional().describe('Author admin ID'),
          authorName: z.string().optional().describe('Author name'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
        .optional()
        .describe('Retrieved note'),
      notes: z
        .array(
          z.object({
            noteId: z.string().describe('Note ID'),
            body: z.string().optional().describe('Note body'),
            authorId: z.string().optional().describe('Author admin ID'),
            authorName: z.string().optional().describe('Author name'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('Notes returned for list operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (ctx.input.noteId) {
      let result = await client.getNote(ctx.input.noteId);
      let note = mapNote(result);

      return {
        output: { note },
        message: `Retrieved note **${note.noteId}**`
      };
    }

    if (ctx.input.contactId) {
      let result = await client.listNotes(ctx.input.contactId);
      let notes = (result.data || result.notes || []).map(mapNote);

      return {
        output: { notes },
        message: `Found **${notes.length}** notes for contact **${ctx.input.contactId}**`
      };
    }

    if (ctx.input.companyId) {
      let result = await client.listCompanyNotes(ctx.input.companyId);
      let notes = (result.data || result.notes || []).map(mapNote);

      return {
        output: { notes },
        message: `Found **${notes.length}** notes for company **${ctx.input.companyId}**`
      };
    }

    throw intercomServiceError('Provide noteId, contactId, or companyId');
  })
  .build();

let mapNote = (data: any) => ({
  noteId: String(data.id),
  body: stringOrUndefined(data.body),
  authorId: data.author?.id ? String(data.author.id) : undefined,
  authorName: stringOrUndefined(data.author?.name),
  createdAt: timestampOrUndefined(data.created_at)
});
