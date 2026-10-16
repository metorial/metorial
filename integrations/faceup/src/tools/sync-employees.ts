import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaceUpClient } from '../lib/client';
import { syncEmployeesInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let syncEmployees = SlateTool.create(spec, {
  name: 'Sync Employees',
  key: 'sync_employees',
  description:
    'Create or update up to 1,000 FaceUp employee directory entries by email. The entire batch is accepted or rejected together. Employees omitted from the batch remain unchanged; use Inactive to deactivate an employee.',
  tags: { readOnly: false }
})
  .input(syncEmployeesInputSchema)
  .output(
    z.object({
      success: z.boolean().describe('Whether FaceUp confirmed the batch was synced.'),
      submittedCount: z
        .number()
        .describe('Number of employee entries submitted in this batch.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaceUpClient(ctx.auth);
    let result = await client.syncEmployees(ctx.input.employees);
    return {
      output: { success: result.success, submittedCount: ctx.input.employees.length },
      message: `Synced ${ctx.input.employees.length} employee directory entry or entries.`
    };
  })
  .build();
