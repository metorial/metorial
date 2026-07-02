import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
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
      noteId: z.string().describe('ID of the note to update'),
      description: z.string().optional().describe('Updated note content/text'),
      owner: z.number().optional().describe('User ID of the note owner'),
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
    let client = createClient(ctx);
    let { noteId, customFields, ...fields } = ctx.input;

    let updateData: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (customFields) {
      Object.assign(updateData, customFields);
    }

    await client.updateNote(noteId, updateData);

    return {
      output: { noteId },
      message: `Note \`${noteId}\` updated successfully.`
    };
  })
  .build();
