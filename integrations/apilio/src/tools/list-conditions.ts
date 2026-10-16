import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConditions = SlateTool.create(spec, {
  name: 'List Conditions',
  key: 'list_conditions',
  description: `Retrieve conditions from your Apilio account. Use get_condition to read a condition's current evaluation state. Conditions are rules that compare variable values against expected states (e.g., "Is it nighttime?") and are combined with AND/OR/NOT logic in logicblocks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conditionType: z
        .enum(['variable', 'time', 'tuya'])
        .optional()
        .describe(
          'Filter to variable, time, or Tuya conditions. Omit to list all condition types.'
        )
    })
  )
  .output(
    z.object({
      conditions: z
        .array(
          z.object({
            conditionId: z.string().describe('Unique identifier of the condition'),
            name: z.string().describe('Name of the condition'),
            met: z
              .boolean()
              .optional()
              .describe('Whether the condition is currently met (true) or not (false)'),
            createdAt: z.string().optional().describe('When the condition was created'),
            updatedAt: z.string().describe('When the condition was last updated')
          })
        )
        .describe('List of all conditions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let conditions = await client.listConditions(ctx.input.conditionType);

    let mapped = conditions.map(c => ({
      conditionId: c.id,
      name: c.name,
      met: c.met,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { conditions: mapped },
      message: `Found **${mapped.length}** condition(s). Use get_condition to check their current state.`
    };
  })
  .build();
