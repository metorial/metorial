import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { mapStateResponse, stateOutputSchema } from '../lib/state';
import { spec } from '../spec';

export let getState = SlateTool.create(spec, {
  name: 'Get Saved State',
  key: 'get_state',
  description:
    'Read saved model, memory, search, routing, and feature settings for the connected application or a specific user.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      user: z
        .string()
        .optional()
        .describe('End-user identifier for user-scoped state; omit for application state'),
      appName: z
        .string()
        .optional()
        .describe('Application name for centralized enterprise state management')
    })
  )
  .output(stateOutputSchema)
  .handleInvocation(async ctx => {
    let output = mapStateResponse(await createClient(ctx).getState(ctx.input));
    return {
      output,
      message: `Retrieved **${output.scope}** settings for **${output.key}**.`
    };
  })
  .build();
