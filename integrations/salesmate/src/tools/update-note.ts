import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireNoteRecordId, resolveNoteModuleId } from '../lib/helpers';
import { spec } from '../spec';

export let updateNote = SlateTool.create(spec, {
  name: 'Update Note',
  key: 'update_note',
  description: `Update an existing note in Salesmate. Use this to modify the note content or other fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      linkedModule: z
        .string()
        .optional()
        .describe(
          'Module containing the note: Contact, Company, Deal, Task, or Product. Required unless moduleId is provided.'
        ),
      moduleId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Module ID. Call get_module_id for custom modules. Required unless linkedModule is provided.'
        ),
      linkedRecordId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('ID of the record containing the note; required to address a note.'),
      noteId: z.string().describe('ID of the note to update'),
      description: z.string().optional().describe('Updated note content/text'),
      owner: z
        .number()
        .optional()
        .describe(
          'Note author reassignment is not supported by Salesmate; omit this field when updating note content'
        ),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('ID of the updated note')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.owner !== undefined) {
      throw createApiServiceError(
        'Salesmate does not support changing a note author. Omit owner and update the note content.',
        {
          reason: 'salesmate_unsupported_note_owner'
        }
      );
    }
    let client = createClient(ctx);
    let { noteId, description, customFields } = ctx.input;
    let updateData = {
      ...customFields,
      ...(description !== undefined ? { note: description } : {}),
      type: 'Note'
    };
    await client.updateNote(
      noteId,
      resolveNoteModuleId(ctx.input),
      requireNoteRecordId(ctx.input.linkedRecordId),
      updateData
    );

    return {
      output: { noteId },
      message: `Note \`${noteId}\` updated successfully.`
    };
  })
  .build();
