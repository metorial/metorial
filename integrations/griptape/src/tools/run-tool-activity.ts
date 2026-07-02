import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runToolActivity = SlateTool.create(spec, {
  name: 'Run Tool Activity',
  key: 'run_tool_activity',
  description: `Execute an activity on a Griptape Cloud Tool. Tools extend LLM capabilities to interact with third-party services, APIs, search, and utilities. Each tool exposes named activities as HTTP POST endpoints that can be invoked with custom input.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      toolId: z.string().describe('ID of the tool to run'),
      activityPath: z
        .string()
        .describe('Name/path of the activity to invoke (e.g., "search", "calculate")'),
      activityInput: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input data for the activity')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Results from the tool activity execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let results = await client.runToolActivity(
      ctx.input.toolId,
      ctx.input.activityPath,
      ctx.input.activityInput
    );

    return {
      output: { results },
      message: `Executed activity **${ctx.input.activityPath}** on tool ${ctx.input.toolId}.`
    };
  })
  .build();
