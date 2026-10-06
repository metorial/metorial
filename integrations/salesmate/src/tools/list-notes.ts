import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, resolveNoteModuleId } from '../lib/helpers';
import { spec } from '../spec';

export let listNotes = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description:
    'List notes for a Salesmate record, including note IDs, content, authors, and pinned state. Use the returned note IDs to retrieve, update, or delete a note.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      linkedModule: z
        .string()
        .optional()
        .describe(
          'Module: Contact, Company, Deal, Task, or Product. Required unless moduleId is provided.'
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
        .describe('ID of the record whose notes should be listed')
    })
  )
  .output(
    z.object({
      notes: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Notes associated with the record')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).listNotes(
      resolveNoteModuleId(ctx.input),
      ctx.input.linkedRecordId
    );
    let data: unknown = result?.Data;
    if (!Array.isArray(data) || !data.every(isApiErrorRecord)) {
      throw createApiServiceError('Salesmate returned an unexpected notes response.', {
        reason: 'salesmate_invalid_response'
      });
    }
    return {
      output: { notes: data },
      message: `Found **${data.length}** notes for record \`${ctx.input.linkedRecordId}\`.`
    };
  })
  .build();
