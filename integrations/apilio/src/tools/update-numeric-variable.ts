import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateNumericVariable = SlateTool.create(spec, {
  name: 'Update Numeric Variable',
  key: 'update_numeric_variable',
  description: `Set a numeric variable to an absolute value, or add/subtract from the current value in Apilio. Use **set** to assign a specific number, **add** to increment, or **subtract** to decrement. Useful for counters, thresholds, and sensor-based automations.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      variableId: z.string().describe('ID (UUID) of the numeric variable to update'),
      action: z
        .enum(['set', 'add', 'subtract'])
        .describe(
          'Action to perform: set an absolute value, add to current, or subtract from current'
        ),
      value: z.number().describe('The value to set, add, or subtract')
    })
  )
  .output(
    z.object({
      variableId: z.string().describe('ID of the updated numeric variable'),
      name: z.string().describe('Name of the numeric variable'),
      value: z.number().describe('New value after the operation'),
      updatedAt: z.string().describe('When the variable was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let newValue: number;
    if (ctx.input.action === 'set') {
      newValue = ctx.input.value;
    } else {
      let current = await client.getNumericVariable(ctx.input.variableId);
      if (ctx.input.action === 'add') {
        newValue = current.value + ctx.input.value;
      } else {
        newValue = current.value - ctx.input.value;
      }
    }

    let updated = await client.updateNumericVariable(ctx.input.variableId, newValue);

    let actionLabel =
      ctx.input.action === 'set'
        ? 'set to'
        : ctx.input.action === 'add'
          ? 'increased by'
          : 'decreased by';

    return {
      output: {
        variableId: updated.id,
        name: updated.name,
        value: updated.value,
        updatedAt: updated.updated_at
      },
      message: `Numeric variable **${updated.name}** ${actionLabel} **${ctx.input.value}** (now **${updated.value}**).`
    };
  })
  .build();
