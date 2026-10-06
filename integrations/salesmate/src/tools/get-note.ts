import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireNoteRecordId, resolveNoteModuleId } from '../lib/helpers';
import { spec } from '../spec';

export let getNote = SlateTool.create(spec, {
  name: 'Get Note',
  key: 'get_note',
  description: `Retrieve a note by its ID from Salesmate.`,
  tags: {
    readOnly: true
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
      noteId: z.string().describe('ID of the note to retrieve')
    })
  )
  .output(
    z.object({
      note: z.record(z.string(), z.unknown()).describe('Full note record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getNote(
      ctx.input.noteId,
      resolveNoteModuleId(ctx.input),
      requireNoteRecordId(ctx.input.linkedRecordId)
    );
    let note = result?.Data ?? result;

    return {
      output: { note },
      message: `Retrieved note \`${ctx.input.noteId}\`.`
    };
  })
  .build();
