import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCondition = SlateTool.create(spec, {
  name: 'Get Condition',
  key: 'get_condition',
  description: `Retrieve the details and current evaluation state of a specific condition in Apilio. Returns whether the condition is currently met, which is useful for checking automation rule states before triggering logicblocks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conditionId: z
        .string()
        .describe('ID (UUID) from list_conditions of the condition to retrieve'),
      conditionType: z
        .enum(['variable', 'time', 'tuya'])
        .optional()
        .describe(
          'Condition type used when listing conditions. Omit to discover the type automatically.'
        )
    })
  )
  .output(
    z.object({
      conditionId: z.string().describe('Unique identifier of the condition'),
      name: z.string().describe('Name of the condition'),
      met: z.boolean().describe('Whether the condition is currently met'),
      createdAt: z.string().optional().describe('When the condition was created'),
      updatedAt: z.string().describe('When the condition was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let condition = await client.getCondition(ctx.input.conditionId, ctx.input.conditionType);

    return {
      output: {
        conditionId: condition.id,
        name: condition.name,
        met: condition.met,
        createdAt: condition.created_at,
        updatedAt: condition.updated_at
      },
      message: `Condition **${condition.name}** is currently **${condition.met ? 'met' : 'not met'}**.`
    };
  })
  .build();
