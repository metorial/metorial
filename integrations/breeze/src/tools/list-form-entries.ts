import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listFormEntries = SlateTool.create(spec, {
  name: 'List Form Entries',
  key: 'list_form_entries',
  description: `List all entries (submissions) for a specific form. Optionally include full response details. Entry responses reference field IDs from the form field definitions.`,
  instructions: [
    'Use List Forms with a formId to retrieve field definitions first, so you can map field IDs to field names in the entry responses.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('Form ID to retrieve entries for'),
      details: z.boolean().optional().describe('Include full response details')
    })
  )
  .output(
    z.object({
      entries: z.array(z.any()).describe('Array of form entry objects with responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let entries = await client.listFormEntries(ctx.input.formId, ctx.input.details);
    let entriesArray = Array.isArray(entries) ? entries : [];

    return {
      output: { entries: entriesArray },
      message: `Found **${entriesArray.length}** entries for form (ID: ${ctx.input.formId}).`
    };
  })
  .build();
