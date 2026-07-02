import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
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
      owner: z.number().describe('User ID of the note owner'),
      linkedModule: z
        .string()
        .describe('Module the note is linked to (e.g., "Contact", "Company", "Deal", "Task")'),
      linkedRecordId: z.number().describe('ID of the record the note is linked to'),
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
    let { customFields, ...fields } = ctx.input;
    let data = { ...fields, ...customFields };
    let result = await client.createNote(data);
    let noteId = result?.Data?.id;

    return {
      output: { noteId },
      message: `Note created on **${ctx.input.linkedModule}** \`${ctx.input.linkedRecordId}\` with ID \`${noteId}\`.`
    };
  })
  .build();
