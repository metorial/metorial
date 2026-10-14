import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { browserAgentTypeSchema } from '../lib/schemas';
import { spec } from '../spec';

let taskInputSchema = z.object({
  jobId: z.string().describe('Job ID returned by run_browser_agent'),
  agentType: browserAgentTypeSchema
    .default('browser_use')
    .describe('Agent type used to start the task')
});

export let getBrowserAgentTask = SlateTool.create(spec, {
  name: 'Get Browser Agent Task',
  key: 'get_browser_agent_task',
  description:
    'Retrieve the current status, final result, and execution history of an existing browser agent task. Use the same agent type that started the task.',
  tags: { readOnly: true }
})
  .input(taskInputSchema)
  .output(
    z.object({
      jobId: z.string(),
      agentType: browserAgentTypeSchema,
      status: z.string(),
      liveUrl: z.string().optional().nullable(),
      finalResult: z.string().optional().nullable(),
      steps: z.array(z.any()).optional(),
      error: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });
    let result = await client.getBrowserAgentTask(ctx.input.agentType, ctx.input.jobId);
    let data = result.data as Record<string, unknown> | undefined;
    return {
      output: {
        jobId: (result.jobId ?? ctx.input.jobId) as string,
        agentType: ctx.input.agentType,
        status: result.status as string,
        liveUrl: result.liveUrl as string | null | undefined,
        finalResult: data?.finalResult as string | null | undefined,
        steps: data?.steps as unknown[] | undefined,
        error: result.error as string | null | undefined
      },
      message: `Agent task **${ctx.input.jobId}** is **${result.status}**.`
    };
  })
  .build();

export let stopBrowserAgentTask = SlateTool.create(spec, {
  name: 'Stop Browser Agent Task',
  key: 'stop_browser_agent_task',
  description:
    'Stop an existing browser agent task to halt its actions. Use the same agent type that started the task. Call get_browser_agent_task afterward to inspect the final state.',
  tags: { destructive: true }
})
  .input(taskInputSchema)
  .output(
    z.object({ jobId: z.string(), agentType: browserAgentTypeSchema, stopped: z.boolean() })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });
    await client.stopBrowserAgentTask(ctx.input.agentType, ctx.input.jobId);
    return {
      output: { jobId: ctx.input.jobId, agentType: ctx.input.agentType, stopped: true },
      message: `Stopped agent task **${ctx.input.jobId}**.`
    };
  })
  .build();
