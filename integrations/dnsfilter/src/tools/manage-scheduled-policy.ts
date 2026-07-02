import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageScheduledPolicy = SlateTool.create(spec, {
  name: 'Manage Scheduled Policy',
  key: 'manage_scheduled_policy',
  description: `List, create, update, or delete scheduled policies. Scheduled policies apply different filtering rules during specific time windows (e.g., stricter filtering during work hours, relaxed on weekends).
- **list**: Get all scheduled policies.
- **create**: Create a new time-based schedule.
- **update**: Modify an existing schedule.
- **delete**: Remove a scheduled policy.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      scheduledPolicyId: z
        .string()
        .optional()
        .describe('Scheduled policy ID (required for update/delete)'),
      policyId: z.string().optional().describe('Policy ID to apply during the schedule'),
      startTime: z.string().optional().describe('Schedule start time (e.g., "09:00")'),
      endTime: z.string().optional().describe('Schedule end time (e.g., "17:00")'),
      days: z
        .array(z.string())
        .optional()
        .describe('Days of the week (e.g., ["monday","tuesday"])'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional schedule attributes')
    })
  )
  .output(
    z.object({
      scheduledPolicies: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of scheduled policies (for list)'),
      scheduledPolicy: z
        .record(z.string(), z.any())
        .optional()
        .describe('Scheduled policy details (for create/update)'),
      deleted: z.boolean().optional().describe('Whether the scheduled policy was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, scheduledPolicyId } = ctx.input;

    if (action === 'list') {
      let scheduledPolicies = await client.listScheduledPolicies();
      return {
        output: { scheduledPolicies },
        message: `Found **${scheduledPolicies.length}** scheduled policy(ies).`
      };
    }

    if (action === 'delete') {
      if (!scheduledPolicyId) throw new Error('scheduledPolicyId is required for delete');
      await client.deleteScheduledPolicy(scheduledPolicyId);
      return {
        output: { deleted: true },
        message: `Deleted scheduled policy **${scheduledPolicyId}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.policyId) params.policy_id = ctx.input.policyId;
    if (ctx.input.startTime) params.start_time = ctx.input.startTime;
    if (ctx.input.endTime) params.end_time = ctx.input.endTime;
    if (ctx.input.days) params.days = ctx.input.days;
    if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);

    if (action === 'create') {
      let scheduledPolicy = await client.createScheduledPolicy(params);
      return {
        output: { scheduledPolicy },
        message: `Created scheduled policy.`
      };
    }

    if (!scheduledPolicyId) throw new Error('scheduledPolicyId is required for update');
    let scheduledPolicy = await client.updateScheduledPolicy(scheduledPolicyId, params);
    return {
      output: { scheduledPolicy },
      message: `Updated scheduled policy **${scheduledPolicyId}**.`
    };
  })
  .build();
