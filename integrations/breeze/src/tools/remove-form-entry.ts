import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let removeFormEntry = SlateTool.create(spec, {
  name: 'Remove Form Entry',
  key: 'remove_form_entry',
  description: `Remove a form entry (submission) by its entry ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      entryId: z.string().describe('ID of the form entry to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.removeFormEntry(ctx.input.entryId);

    return {
      output: { success: result === true || result === 'true' },
      message: `Removed form entry (ID: ${ctx.input.entryId}).`
    };
  })
  .build();
