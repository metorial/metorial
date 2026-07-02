import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let executeTrigger = SlateTool.create(spec, {
  name: 'Execute Trigger',
  key: 'execute_trigger',
  description: `Programmatically execute a Sidetracker trigger for a given session. Use this to fire call-to-action events via the API, enabling deep integration with your system based on custom logic or external events.`
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID of the visitor to execute the trigger for'),
      triggerId: z.string().describe('Unique ID of the trigger to execute')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the trigger was successfully executed'),
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.executeTrigger(ctx.input.sessionId, ctx.input.triggerId);

    return {
      output: {
        success: true,
        result
      },
      message: `Executed trigger \`${ctx.input.triggerId}\` for session \`${ctx.input.sessionId}\`.`
    };
  })
  .build();
