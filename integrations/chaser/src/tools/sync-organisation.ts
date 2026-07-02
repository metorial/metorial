import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { syncTaskEnum } from '../lib/schemas';
import { spec } from '../spec';

export let syncOrganisation = SlateTool.create(spec, {
  name: 'Sync Organisation',
  key: 'sync_organisation',
  description: `Trigger a manual synchronisation of the organisation data in Chaser. Optionally specify post-sync tasks such as calculating next chases, updating invoice instalments, or calculating contact balances.`,
  constraints: ['Rate limited to 5 requests per hour.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tasks: z
        .array(syncTaskEnum)
        .optional()
        .describe(
          'Post-sync tasks to execute. Available: CALCULATE_NEXT_CHASES, UPDATE_INVOICE_INSTALMENTS, CALCULATE_CONTACT_BALANCES, VERIFY_CONTACT_CREDIT_LIMIT, CALCULATE_TASK_REMINDERS, CALCULATE_TOTAL_REVENUE'
        )
    })
  )
  .output(
    z.object({
      synced: z.boolean().describe('Whether the sync was triggered successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.syncOrganisation(ctx.input.tasks);

    return {
      output: { synced: result.result },
      message: `Organisation sync triggered${ctx.input.tasks?.length ? ` with tasks: ${ctx.input.tasks.join(', ')}` : ''}. Result: ${result.result ? 'success' : 'pending'}.`
    };
  })
  .build();
