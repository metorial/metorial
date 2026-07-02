import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let createBatchCall = SlateTool.create(spec, {
  name: 'Create Batch Call',
  key: 'create_batch_call',
  description: `Create a batch outbound calling campaign to automate large-scale outreach. Specify a source number and a list of tasks (destination numbers) with optional per-call customizations. Campaigns can be scheduled or started immediately.`,
  constraints: ['Source number must be purchased from or imported to Retell.']
})
  .input(
    z.object({
      fromNumber: z.string().describe('Source phone number in E.164 format'),
      name: z.string().optional().describe('Name for the batch campaign'),
      triggerTimestamp: z
        .number()
        .optional()
        .describe('Unix timestamp in ms to schedule the batch. Omit for immediate execution.'),
      tasks: z
        .array(
          z.object({
            toNumber: z.string().describe('Destination phone number in E.164 format'),
            overrideAgentId: z
              .string()
              .optional()
              .describe('Agent ID override for this specific call'),
            dynamicVariables: z
              .record(z.string(), z.string())
              .optional()
              .describe('Dynamic variables to inject into the prompt'),
            metadata: z
              .record(z.string(), z.any())
              .optional()
              .describe('Custom metadata for this call')
          })
        )
        .describe('List of call tasks to execute'),
      reservedConcurrency: z
        .number()
        .optional()
        .describe('Concurrency reserved for non-batch calls (0 or more)')
    })
  )
  .output(
    z.object({
      batchCallId: z.string().describe('Unique identifier of the batch call'),
      name: z.string().optional().describe('Name of the batch'),
      fromNumber: z.string().describe('Source phone number'),
      totalTaskCount: z.number().describe('Total number of tasks in the batch'),
      scheduledTimestamp: z.number().optional().describe('Scheduled execution timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);

    let body: Record<string, any> = {
      from_number: ctx.input.fromNumber,
      tasks: ctx.input.tasks.map(t => {
        let task: Record<string, any> = { to_number: t.toNumber };
        if (t.overrideAgentId) task.override_agent_id = t.overrideAgentId;
        if (t.dynamicVariables) task.retell_llm_dynamic_variables = t.dynamicVariables;
        if (t.metadata) task.metadata = t.metadata;
        return task;
      })
    };

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.triggerTimestamp) body.trigger_timestamp = ctx.input.triggerTimestamp;
    if (ctx.input.reservedConcurrency !== undefined)
      body.reserved_concurrency = ctx.input.reservedConcurrency;

    let batch = await client.createBatchCall(body);

    return {
      output: {
        batchCallId: batch.batch_call_id,
        name: batch.name,
        fromNumber: batch.from_number,
        totalTaskCount: batch.total_task_count,
        scheduledTimestamp: batch.scheduled_timestamp
      },
      message: `Created batch call **${batch.batch_call_id}** with **${batch.total_task_count}** task(s).`
    };
  })
  .build();
