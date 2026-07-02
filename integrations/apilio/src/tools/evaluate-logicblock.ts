import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let evaluateLogicblock = SlateTool.create(spec, {
  name: 'Evaluate Logicblock',
  key: 'evaluate_logicblock',
  description: `Trigger the evaluation of a logicblock in Apilio. This evaluates all conditions in the logicblock and executes the associated action chain (positive or negative) based on the result. The logicblock must be active for the actions to run.`,
  instructions: [
    'The logicblock must be active for its actions to execute upon evaluation.',
    'Evaluation checks all linked conditions and triggers the appropriate action chain.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      logicblockId: z.string().describe('ID (UUID) of the logicblock to evaluate')
    })
  )
  .output(
    z.object({
      logicblockId: z.string().describe('ID of the evaluated logicblock'),
      name: z.string().describe('Name of the logicblock'),
      active: z.boolean().describe('Whether the logicblock is active'),
      result: z
        .boolean()
        .nullable()
        .describe('Evaluation result: true (positive), false (negative), or null'),
      updatedAt: z.string().describe('When the logicblock was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let logicblock = await client.evaluateLogicblock(ctx.input.logicblockId);

    return {
      output: {
        logicblockId: logicblock.id,
        name: logicblock.name,
        active: logicblock.active,
        result: logicblock.result,
        updatedAt: logicblock.updated_at
      },
      message: `Logicblock **${logicblock.name}** evaluated — result: **${logicblock.result === null ? 'N/A' : logicblock.result ? 'positive' : 'negative'}**.`
    };
  })
  .build();
