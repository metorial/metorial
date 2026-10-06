import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireNoteRecordId, resolveNoteModuleId } from '../lib/helpers';
import { spec } from '../spec';

export let deleteNote = SlateTool.create(spec, {
  name: 'Delete Note',
  key: 'delete_note',
  description: `Delete a note from Salesmate by its ID. This action is permanent.`,
  tags: {
    destructive: true,
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
      noteId: z.string().describe('ID of the note to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteNote(
      ctx.input.noteId,
      resolveNoteModuleId(ctx.input),
      requireNoteRecordId(ctx.input.linkedRecordId)
    );

    return {
      output: { success: true },
      message: `Note \`${ctx.input.noteId}\` deleted.`
    };
  })
  .build();
