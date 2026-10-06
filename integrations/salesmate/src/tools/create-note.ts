import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireNoteRecordId, resolveNoteModuleId } from '../lib/helpers';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Add a note to a contact, company, deal, or activity in Salesmate. Notes track additional context and information related to a record.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      description: z.string().describe('Note content/text'),
      owner: z
        .number()
        .describe(
          'Author user ID; must match the authenticated user from get_current_user because Salesmate assigns authorship from the API token'
        ),
      linkedModule: z
        .string()
        .describe('Module the note is linked to (e.g., "Contact", "Company", "Deal", "Task")'),
      linkedRecordId: z.number().describe('ID of the record the note is linked to'),
      moduleId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Module ID for a custom module; call get_module_id to discover it. Overrides linkedModule.'
        ),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('ID of the created note')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let currentUser = await client.getCurrentUser();
    if (String(currentUser.Data.id) !== String(ctx.input.owner)) {
      throw createApiServiceError(
        'Salesmate notes are authored by the authenticated user. Set owner to the user ID returned by get_current_user.',
        {
          reason: 'salesmate_unsupported_note_owner'
        }
      );
    }
    let { customFields, description } = ctx.input;
    let data = { ...customFields, note: description, type: 'Note' };
    let result = await client.createNote(
      resolveNoteModuleId(ctx.input),
      requireNoteRecordId(ctx.input.linkedRecordId),
      data
    );
    let noteId = result?.Data?.noteId ?? result?.Data?.id;

    return {
      output: { noteId },
      message: `Note created on **${ctx.input.linkedModule}** \`${ctx.input.linkedRecordId}\` with ID \`${noteId}\`.`
    };
  })
  .build();
